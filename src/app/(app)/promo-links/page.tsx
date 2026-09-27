import { requireFeature } from '@/lib/permissions';
import { createClient } from '@/lib/supabase/server';
import type { Product } from '@/lib/types';
import { createPromoLink } from './actions';
import PromoLinkRow from '@/components/PromoLinkRow';

const WEBSITE_URL = process.env.NEXT_PUBLIC_WEBSITE_URL ?? 'https://sochillbathclub.com';

export default async function PromoLinksPage() {
  await requireFeature('promo_links');
  const supabase = await createClient();

  const { data: links } = await supabase
    .from('products')
    .select('*')
    .eq('is_promo_link', true)
    .order('created_at', { ascending: false })
    .returns<Product[]>();

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-stone-900">Promo Checkout Links</h1>
        <p className="mt-1 text-sm text-stone-500">
          Standalone checkout pages for promotions — create one, send the link to whoever you want, and they can pay
          without browsing the full pricing page. Works like Arketa&apos;s checkout links.
        </p>
      </div>

      <form action={createPromoLink} className="grid grid-cols-2 gap-4 rounded-xl border border-stone-200 p-4">
        <div className="col-span-2">
          <label className="block text-sm text-stone-700">Name</label>
          <input
            name="name"
            required
            placeholder="e.g. Black Friday 3-Month Deal"
            className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-stone-900"
          />
        </div>
        <div className="col-span-2">
          <label className="block text-sm text-stone-700">Description (optional)</label>
          <textarea
            name="description"
            rows={2}
            placeholder="Shown on the checkout page, under the name"
            className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-stone-900"
          />
        </div>
        <div className="col-span-2">
          <label className="block text-sm text-stone-700">Photo (optional)</label>
          <input
            name="image"
            type="file"
            accept="image/*"
            className="mt-1 w-full text-sm text-stone-700 file:mr-3 file:rounded-lg file:border-0 file:bg-stone-200 file:px-3 file:py-2 file:text-sm file:font-medium file:text-stone-700 hover:file:bg-stone-300"
          />
          <p className="mt-0.5 text-xs text-stone-500">Shown at the top of the checkout page. Under 6MB.</p>
        </div>
        <div>
          <label className="block text-sm text-stone-700">Price (SGD)</label>
          <input
            name="price"
            type="number"
            step="0.01"
            min="0"
            required
            className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-stone-900"
          />
        </div>
        <div>
          <label className="block text-sm text-stone-700">Billing</label>
          <select
            name="billing"
            defaultValue="one_time"
            className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-stone-900"
          >
            <option value="one_time">One-time payment</option>
            <option value="recurring">Recurring monthly (membership)</option>
          </select>
        </div>
        <div>
          <label className="block text-sm text-stone-700">Valid for (days)</label>
          <input
            name="validity_days"
            type="number"
            min="1"
            step="1"
            placeholder="Leave blank for no expiry"
            className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-stone-900"
          />
          <p className="mt-0.5 text-xs text-stone-500">Ignored for recurring — that renews monthly instead.</p>
        </div>
        <div>
          <label className="block text-sm text-stone-700">Payment method</label>
          <select
            name="payment_provider"
            defaultValue="qashier"
            className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-stone-900"
          >
            <option value="qashier">Qashier</option>
            <option value="stripe">Stripe</option>
          </select>
          <p className="mt-0.5 text-xs text-stone-500">Ignored for recurring — that&apos;s always Stripe.</p>
        </div>
        <div>
          <label className="block text-sm text-stone-700">Link expires (optional)</label>
          <input
            name="promo_expires_at"
            type="date"
            className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-stone-900"
          />
          <p className="mt-0.5 text-xs text-stone-500">After this date the page shows as expired.</p>
        </div>
        <div>
          <label className="block text-sm text-stone-700">Custom link (optional)</label>
          <input
            name="slug"
            placeholder="e.g. black-friday"
            className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-stone-900"
          />
          <p className="mt-0.5 text-xs text-stone-500">Leave blank for a random one.</p>
        </div>
        <div className="col-span-2">
          <button className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700">
            Create checkout link
          </button>
        </div>
      </form>

      <div className="space-y-2">
        {links?.map((link) => (
          <PromoLinkRow key={link.id} product={link} websiteUrl={WEBSITE_URL} />
        ))}
        {!links?.length && <p className="text-sm text-stone-500">No promo checkout links yet.</p>}
      </div>
    </div>
  );
}
