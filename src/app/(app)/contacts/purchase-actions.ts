'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { computeDiscount, computeSessionsTotal } from '@/lib/discounts';
import { addMonthsClamped } from '@/lib/dateMath';
import { generateGiftCode, giftValidityMonths } from '@/lib/giftCards';
import { stripe } from '@/lib/stripe';
import type { DiscountCode, PaymentMethod, Product } from '@/lib/types';
import { assertFeature } from '@/lib/permissions';
import { sendPurchaseReceipt } from '@/lib/receipts';

function computeExpiry(purchaseDate: string, product: Product): string | null {
  // True memberships renew on the same calendar day each month (Jan 31 -> Feb 28), not a
  // flat day count — a flat +30 days drifts later relative to the purchase date over time.
  if (product.billing_period_months) {
    return addMonthsClamped(purchaseDate, product.billing_period_months);
  }
  const days = product.validity_days ?? product.billing_period_days;
  if (!days) return null;
  const date = new Date(purchaseDate);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

export async function addPurchase(contactId: string, formData: FormData) {
  await assertFeature('manage_purchases', 'Not authorized to manage purchases');
  const productId = String(formData.get('product_id') ?? '');
  if (!productId) return;

  const purchaseDate = (formData.get('purchase_date') as string) || new Date().toISOString().slice(0, 10);
  const discountCodeId = String(formData.get('discount_code_id') ?? '') || null;
  const supabase = await createClient();

  const [
    { data: product, error: productError },
    { data: contact, error: contactError },
    discountResult,
  ] = await Promise.all([
    supabase.from('products').select('*').eq('id', productId).single<Product>(),
    supabase.from('contacts').select('source').eq('id', contactId).single<{ source: string }>(),
    discountCodeId
      ? supabase.from('discount_codes').select('*').eq('id', discountCodeId).single<DiscountCode>()
      : Promise.resolve({ data: null, error: null }),
  ]);

  if (productError || !product) throw new Error(productError?.message ?? 'Product not found');
  if (contactError) throw new Error(contactError.message);
  if (discountResult.error) throw new Error(discountResult.error.message);
  const isStaffMembership = contact.source === 'staff' && product.item_type === 'membership';
  const discountCode: DiscountCode | null = discountResult.data;

  const computed = computeDiscount(product.price, discountCode);
  const sessionsTotal = computeSessionsTotal(product.sessions_included, discountCode);

  // Lets staff charge something other than the catalog/discount-code price for a
  // one-off situation — e.g. someone who already paid for a single session and is
  // topping up to a 5-pack only owes the difference, not the pack's full price.
  // An internal tool trusting staff-entered amounts here is the same trust level
  // the "Amount paid" field already had; unlike the public website checkout, there's
  // no untrusted client to defend against.
  const overridePriceRaw = String(formData.get('override_price') ?? '').trim();
  const hasOverride = overridePriceRaw !== '' && Number.isFinite(Number(overridePriceRaw));
  const finalPrice = hasOverride ? Math.max(0, Number(overridePriceRaw)) : computed.finalPrice;
  const discountAmount = hasOverride ? Math.max(0, product.price - finalPrice) : computed.discountAmount;
  const discountLabel = hasOverride && !discountCode ? 'Custom price adjustment' : (discountCode?.label ?? null);

  const amountPaid = isStaffMembership
    ? 0
    : Math.min(Math.max(Number(formData.get('amount_paid')) || 0, 0), finalPrice);
  const paymentMethod = isStaffMembership ? 'comp' : (formData.get('payment_method') as PaymentMethod) || null;

  if (product.item_type === 'gift_card') {
    const recipientEmail = String(formData.get('gift_recipient_email') ?? '').trim();
    if (!recipientEmail) throw new Error('Recipient email is required for a gift card purchase');

    const giftCode = generateGiftCode();
    const giftedItemName = product.name.replace(/^Gift Card:\s*/, '');

    const { error: codeError } = await supabase.from('discount_codes').insert({
      code: giftCode,
      label: `Gift: ${giftedItemName} (for ${recipientEmail})`,
      discount_type: 'full_comp',
      value: 0,
      bonus_sessions: 0,
      single_use: true,
      is_gift_code: true,
    });
    if (codeError) throw new Error(codeError.message);

    const { data: giftInserted, error } = await supabase.from('purchases').insert({
      contact_id: contactId,
      product_id: product.id,
      name: product.name,
      item_type: product.item_type,
      list_price: product.price,
      discount_code_id: discountCode?.id ?? null,
      discount_label: discountCode?.label ?? null,
      discount_amount: discountAmount,
      price: finalPrice,
      payment_method: finalPrice > 0 ? paymentMethod : null,
      amount_paid: amountPaid,
      sessions_total: null,
      sessions_remaining: null,
      purchase_date: purchaseDate,
      expiry_date: null,
      is_gift: true,
      gift_recipient_email: recipientEmail,
      gift_code: giftCode,
    }).select('id').single();

    if (error) throw new Error(error.message);

    sendPurchaseReceipt(supabase, giftInserted?.id);

    revalidatePath(`/contacts/${contactId}`);
    revalidatePath('/discounts');
    return;
  }

  // A pack redeemed with a gift code gets the gift validity for its session count, not the
  // regular pack's validity.
  const giftMonths =
    discountCode?.is_gift_code && ['session_pack', 'single_session'].includes(product.item_type)
      ? giftValidityMonths(sessionsTotal)
      : null;
  const giftExpiry = giftMonths ? addMonthsClamped(purchaseDate, giftMonths) : null;

  const { data: inserted, error } = await supabase.from('purchases').insert({
    contact_id: contactId,
    product_id: product.id,
    name: product.name,
    item_type: product.item_type,
    list_price: product.price,
    discount_code_id: discountCode?.id ?? null,
    discount_label: isStaffMembership ? 'Staff — complimentary membership' : discountLabel,
    discount_amount: isStaffMembership ? product.price : discountAmount,
    price: isStaffMembership ? 0 : finalPrice,
    payment_method: finalPrice > 0 ? paymentMethod : null,
    amount_paid: amountPaid,
    sessions_total: sessionsTotal,
    sessions_remaining: sessionsTotal,
    purchase_date: purchaseDate,
    // Staff memberships are a standing perk, not a renewing subscription — never
    // expire on their own; only cancelling here (admin-only) ends one.
    expiry_date: isStaffMembership ? null : giftExpiry ?? computeExpiry(purchaseDate, product),
  }).select('id').single();

  if (error) {
    if (error.code === '23505' && product.item_type === 'membership') {
      throw new Error(
        'This contact already has an active membership. Cancel it first before adding a new one.',
      );
    }
    throw new Error(error.message);
  }

  sendPurchaseReceipt(supabase, inserted?.id);

  if (discountCode?.single_use) {
    if (discountCode.is_gift_code) {
      // Keep the row so the original purchaser's gift-card card can show it
      // was redeemed, instead of hard-deleting and leaving a dangling code.
      await supabase
        .from('discount_codes')
        .update({ is_active: false, redeemed_at: new Date().toISOString() })
        .eq('id', discountCode.id);
    } else {
      await supabase.from('discount_codes').delete().eq('id', discountCode.id);
    }
  }

  revalidatePath(`/contacts/${contactId}`);
}

export async function adjustSessions(purchaseId: string, contactId: string, delta: number) {
  await assertFeature('manage_purchases', 'Not authorized to manage purchases');
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: purchase, error: fetchError } = await supabase
    .from('purchases')
    .select('sessions_remaining, sessions_total')
    .eq('id', purchaseId)
    .single();

  if (fetchError || !purchase) throw new Error(fetchError?.message ?? 'Purchase not found');

  const nextRemaining = Math.max(0, (purchase.sessions_remaining ?? 0) + delta);
  const nextStatus = nextRemaining === 0 ? 'used_up' : 'active';

  let usedUpAt: string | null | undefined;
  if (nextRemaining > 0) {
    usedUpAt = null; // back to active: clear any previous used-up timestamp
  } else if ((purchase.sessions_remaining ?? 0) > 0) {
    usedUpAt = new Date().toISOString(); // just ran out: record when
  } // else: was already at 0, leave the existing timestamp alone

  const { error } = await supabase
    .from('purchases')
    .update({ sessions_remaining: nextRemaining, status: nextStatus, used_up_at: usedUpAt })
    .eq('id', purchaseId);

  if (error) throw new Error(error.message);

  await supabase.from('purchase_adjustments').insert({
    purchase_id: purchaseId,
    delta,
    staff_id: user?.id ?? null,
  });

  if (delta < 0) {
    // Deducting a session means they're using it right now — check them in.
    await supabase.from('visits').insert({
      contact_id: contactId,
      visit_date: new Date().toISOString(),
      service: 'other',
    });
    revalidatePath('/checked-in');
  }

  revalidatePath(`/contacts/${contactId}`);
}

export async function cancelPurchase(purchaseId: string, contactId: string) {
  await assertFeature('manage_purchases', 'Not authorized to manage purchases');
  const supabase = await createClient();

  const { data: purchase, error: fetchError } = await supabase
    .from('purchases')
    .select('item_type, stripe_subscription_id')
    .eq('id', purchaseId)
    .single();
  if (fetchError) throw new Error(fetchError.message);

  if (purchase?.stripe_subscription_id) {
    // Stop future billing, not just our own record — otherwise Stripe keeps
    // charging the card every month even though the CRM shows "cancelled".
    try {
      await stripe.subscriptions.cancel(purchase.stripe_subscription_id);
    } catch {
      // Already cancelled on Stripe's side, or some other issue — still
      // reflect the cancellation in our own records below.
    }
  }

  const { error } = await supabase
    .from('purchases')
    .update({ status: 'cancelled', cancelled_at: new Date().toISOString(), scheduled_cancellation_date: null })
    .eq('id', purchaseId);
  if (error) throw new Error(error.message);

  // Cancelling a membership means the person churned — reflect that in the pipeline.
  if (purchase?.item_type === 'membership') {
    const { error: contactError } = await supabase
      .from('contacts')
      .update({ pipeline_stage: 'churned' })
      .eq('id', contactId);
    if (contactError) throw new Error(contactError.message);
  }

  revalidatePath(`/contacts/${contactId}`);
  revalidatePath('/contacts');
  revalidatePath('/pipeline');
  revalidatePath('/');
}

// Permanently removes a purchase row — for mistakes (a double-click on "Complete
// sale" leaving two identical packs), not real cancellations. Memberships go
// through cancelPurchase instead, since a membership can carry a live Stripe
// subscription that a plain delete here wouldn't stop billing.
export async function deletePurchase(purchaseId: string, contactId: string) {
  await assertFeature('manage_purchases', 'Not authorized to manage purchases');
  const supabase = await createClient();

  const { data: purchase, error: fetchError } = await supabase
    .from('purchases')
    .select('item_type')
    .eq('id', purchaseId)
    .single();
  if (fetchError) throw new Error(fetchError.message);
  if (purchase?.item_type === 'membership') {
    throw new Error('Memberships can\'t be deleted directly — cancel it instead.');
  }

  const { error } = await supabase.from('purchases').delete().eq('id', purchaseId);
  if (error) throw new Error(error.message);

  revalidatePath(`/contacts/${contactId}`);
  revalidatePath('/contacts');
  revalidatePath('/');
}

export async function scheduleCancellation(purchaseId: string, contactId: string, formData: FormData) {
  await assertFeature('manage_purchases', 'Not authorized to manage purchases');
  const date = String(formData.get('scheduled_cancellation_date') ?? '');
  if (!date) throw new Error('Pick a date to schedule the cancellation for');

  const supabase = await createClient();
  const { error } = await supabase
    .from('purchases')
    .update({ scheduled_cancellation_date: date })
    .eq('id', purchaseId);
  if (error) throw new Error(error.message);

  revalidatePath(`/contacts/${contactId}`);
}

export async function unscheduleCancellation(purchaseId: string, contactId: string) {
  await assertFeature('manage_purchases', 'Not authorized to manage purchases');
  const supabase = await createClient();
  const { error } = await supabase
    .from('purchases')
    .update({ scheduled_cancellation_date: null })
    .eq('id', purchaseId);
  if (error) throw new Error(error.message);

  revalidatePath(`/contacts/${contactId}`);
}

// Pushes out a session pack's (or trial/single session's) expiry date — e.g. a
// pack that lapsed while someone was traveling, or a goodwill extension. Also
// un-expires it if it had already lapsed, since a staff-granted extension means
// it's meant to be usable again.
export async function extendPurchaseExpiry(purchaseId: string, contactId: string, formData: FormData) {
  await assertFeature('manage_purchases', 'Not authorized to manage purchases');
  const newExpiry = String(formData.get('new_expiry_date') ?? '').trim();
  if (!newExpiry) throw new Error('Pick a new expiry date');

  const supabase = await createClient();
  const { data: purchase, error: fetchError } = await supabase
    .from('purchases')
    .select('status, sessions_remaining, sessions_total')
    .eq('id', purchaseId)
    .single();
  if (fetchError || !purchase) throw new Error(fetchError?.message ?? 'Purchase not found');

  const wasUsedUp = purchase.sessions_total !== null && (purchase.sessions_remaining ?? 0) <= 0;
  const nextStatus = purchase.status === 'expired' && !wasUsedUp ? 'active' : purchase.status;

  const { error } = await supabase
    .from('purchases')
    .update({ expiry_date: newExpiry, status: nextStatus })
    .eq('id', purchaseId);
  if (error) throw new Error(error.message);

  revalidatePath(`/contacts/${contactId}`);
}

function revalidatePauseAffectedPaths(contactId: string) {
  revalidatePath(`/contacts/${contactId}`);
  revalidatePath('/contacts');
  revalidatePath('/pipeline');
  revalidatePath('/coming-back');
  revalidatePath('/');
}

// Pause actions never throw to the page: a thrown error in a server action replaces the whole screen
// with the framework error page. They return a result the screen shows inline instead.
export type PauseResult = { ok: true } | { ok: false; error: string };

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;
const todaySG = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Singapore' });

async function runPauseAction(fn: () => Promise<void>): Promise<PauseResult> {
  try {
    await fn();
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : '';
    if (/not authorized/i.test(message)) return { ok: false, error: "You don't have permission to change memberships." };
    return { ok: false, error: message || 'Something went wrong. Please try again.' };
  }
}

// Reads an optional date field; blank means "not set". Anything else must be a real YYYY-MM-DD day.
function readDay(formData: FormData, name: string, label: string): string | null {
  const raw = String(formData.get(name) ?? '').trim();
  if (!raw) return null;
  if (!ISO_DAY.test(raw) || Number.isNaN(new Date(`${raw}T00:00:00Z`).getTime())) throw new Error(`${label} is not a valid date.`);
  return raw;
}

type PausablePurchase = {
  item_type: string;
  status: string;
  is_paused: boolean;
  pause_started_at: string | null;
  stripe_subscription_id: string | null;
};

async function loadPausablePurchase(supabase: Awaited<ReturnType<typeof createClient>>, purchaseId: string): Promise<PausablePurchase> {
  const { data, error } = await supabase
    .from('purchases')
    .select('item_type, status, is_paused, pause_started_at, stripe_subscription_id')
    .eq('id', purchaseId)
    .single();
  if (error || !data) throw new Error('Could not find that membership. Refresh the page and try again.');
  if (data.item_type !== 'membership') throw new Error('Only memberships can be paused.');
  return data as PausablePurchase;
}

// Tells Stripe to stop/start billing for a membership that is on a Stripe subscription (a no-op
// for cash/in-store memberships). Runs BEFORE our own database update so a Stripe failure aborts
// the pause instead of leaving the CRM saying "paused" while the member keeps being charged.
// Resuming isn't just "un-pause" — the edge function also pushes the member's next charge out
// by exactly how many days they were paused, using pause_started_at from this purchase row (so
// call this before clearing that column below). pause_resume_date is informational for staff —
// Stripe is never told to auto-resume on that date, since that path wouldn't get the same
// billing-date shift; a human always resumes explicitly here.
async function syncStripePause(
  supabase: Awaited<ReturnType<typeof createClient>>,
  purchaseId: string,
  action: 'pause' | 'resume'
) {
  const { data, error } = await supabase.functions.invoke<{ synced?: boolean; error?: string }>('set-membership-pause', {
    body: { purchase_id: purchaseId, action },
  });
  if (error) throw new Error(`Couldn't update Stripe billing: ${error.message}. Nothing was changed.`);
  if (data?.error) throw new Error(`Couldn't update Stripe billing: ${data.error}. Nothing was changed.`);
}

// Puts a membership on pause right now: Stripe first, then our records.
async function startPauseNow(
  supabase: Awaited<ReturnType<typeof createClient>>,
  purchaseId: string,
  contactId: string,
  fields: { from: string; until: string | null; reason: string | null }
) {
  await syncStripePause(supabase, purchaseId, 'pause');

  const { error } = await supabase
    .from('purchases')
    .update({ is_paused: true, pause_reason: fields.reason, pause_started_at: fields.from, pause_resume_date: fields.until })
    .eq('id', purchaseId);
  if (error) throw new Error(error.message);

  const { error: contactError } = await supabase.from('contacts').update({ pipeline_stage: 'lead' }).eq('id', contactId);
  if (contactError) throw new Error(contactError.message);
}

export async function pauseMembership(purchaseId: string, contactId: string, formData: FormData): Promise<PauseResult> {
  return runPauseAction(async () => {
    await assertFeature('manage_purchases', 'Not authorized to manage purchases');
    const today = todaySG();
    const from = readDay(formData, 'pause_from', 'The pause start date') ?? today;
    const until = readDay(formData, 'pause_until', 'The resume date');
    const reason = String(formData.get('pause_reason') ?? '').trim() || null;
    if (until && until <= from) throw new Error('The resume date must be after the pause start date.');

    const supabase = await createClient();
    const purchase = await loadPausablePurchase(supabase, purchaseId);
    if (purchase.status === 'cancelled') throw new Error('This membership is cancelled, so it cannot be paused.');
    if (purchase.is_paused || purchase.pause_started_at) throw new Error('This membership already has a pause. Edit it instead.');

    if (from > today) {
      // A pause that starts in the future is only scheduled: the member keeps full access (and
      // Stripe keeps billing) until that day. The hourly job then turns it on, pausing Stripe too.
      const { error } = await supabase
        .from('purchases')
        .update({ is_paused: false, pause_reason: reason, pause_started_at: from, pause_resume_date: until })
        .eq('id', purchaseId);
      if (error) throw new Error(error.message);
    } else {
      await startPauseNow(supabase, purchaseId, contactId, { from, until, reason });
    }
    revalidatePauseAffectedPaths(contactId);
  });
}

export async function resumeMembership(purchaseId: string, contactId: string): Promise<PauseResult> {
  return runPauseAction(async () => {
    await assertFeature('manage_purchases', 'Not authorized to manage purchases');
    const supabase = await createClient();
    const purchase = await loadPausablePurchase(supabase, purchaseId);
    if (!purchase.is_paused) throw new Error('This membership is not paused. Refresh the page to see its current state.');

    await syncStripePause(supabase, purchaseId, 'resume');

    const { error } = await supabase
      .from('purchases')
      .update({ is_paused: false, pause_reason: null, pause_started_at: null, pause_resume_date: null })
      .eq('id', purchaseId);
    if (error) throw new Error(error.message);

    const { error: contactError } = await supabase.from('contacts').update({ pipeline_stage: 'active' }).eq('id', contactId);
    if (contactError) throw new Error(contactError.message);

    revalidatePauseAffectedPaths(contactId);
  });
}

// A scheduled pause only exists in our database (Stripe is told when it actually starts), so
// cancelling it must not call Stripe or move the member's pipeline stage.
export async function cancelScheduledPause(purchaseId: string, contactId: string): Promise<PauseResult> {
  return runPauseAction(async () => {
    await assertFeature('manage_purchases', 'Not authorized to manage purchases');
    const supabase = await createClient();
    const purchase = await loadPausablePurchase(supabase, purchaseId);
    if (purchase.is_paused) throw new Error('This pause has already started. Use Resume membership instead.');
    if (!purchase.pause_started_at) throw new Error('There is no scheduled pause to cancel.');

    const { error } = await supabase
      .from('purchases')
      .update({ is_paused: false, pause_reason: null, pause_started_at: null, pause_resume_date: null })
      .eq('id', purchaseId)
      .eq('is_paused', false);
    if (error) throw new Error(error.message);

    revalidatePauseAffectedPaths(contactId);
  });
}

// Edits a pause. A scheduled pause can change its start date, resume date and reason; if the new
// start date is today or earlier it starts straight away. A pause already running can change its
// start date (it cannot be in the future), resume date and reason. Changing dates on a running
// pause never touches Stripe: the billing shift is worked out from the start date when it resumes.
export async function editPause(purchaseId: string, contactId: string, formData: FormData): Promise<PauseResult> {
  return runPauseAction(async () => {
    await assertFeature('manage_purchases', 'Not authorized to manage purchases');
    const today = todaySG();
    const supabase = await createClient();
    const purchase = await loadPausablePurchase(supabase, purchaseId);
    if (!purchase.is_paused && !purchase.pause_started_at) throw new Error('There is no pause to edit. Refresh the page.');

    const currentStart = purchase.pause_started_at ? purchase.pause_started_at.slice(0, 10) : today;
    const from = readDay(formData, 'pause_from', 'The pause start date') ?? currentStart;
    const until = readDay(formData, 'pause_until', 'The resume date');
    const reason = String(formData.get('pause_reason') ?? '').trim() || null;
    if (until && until <= from) throw new Error('The resume date must be after the pause start date.');

    if (purchase.is_paused) {
      if (from > today) throw new Error('A pause that is already running cannot start in the future. Resume the membership and schedule a new pause instead.');
      const { error } = await supabase
        .from('purchases')
        .update({ pause_started_at: from, pause_resume_date: until, pause_reason: reason })
        .eq('id', purchaseId);
      if (error) throw new Error(error.message);
    } else if (from > today) {
      const { error } = await supabase
        .from('purchases')
        .update({ pause_started_at: from, pause_resume_date: until, pause_reason: reason })
        .eq('id', purchaseId);
      if (error) throw new Error(error.message);
    } else {
      await startPauseNow(supabase, purchaseId, contactId, { from, until, reason });
    }
    revalidatePauseAffectedPaths(contactId);
  });
}

export async function updatePayment(purchaseId: string, contactId: string, formData: FormData) {
  await assertFeature('manage_purchases', 'Not authorized to manage purchases');
  const supabase = await createClient();

  const { data: purchase, error: fetchError } = await supabase
    .from('purchases')
    .select('price')
    .eq('id', purchaseId)
    .single();
  if (fetchError || !purchase) throw new Error(fetchError?.message ?? 'Purchase not found');

  const amountPaid = Math.min(Math.max(Number(formData.get('amount_paid')) || 0, 0), purchase.price ?? 0);
  const paymentMethod = (formData.get('payment_method') as PaymentMethod) || null;

  const { error } = await supabase
    .from('purchases')
    .update({ payment_method: paymentMethod, amount_paid: amountPaid })
    .eq('id', purchaseId);

  if (error) throw new Error(error.message);

  revalidatePath(`/contacts/${contactId}`);
}
