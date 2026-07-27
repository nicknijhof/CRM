import type { ContactSource, DiscountType, InteractionChannel, ItemType, PaymentMethod, PipelineStage, PurchaseStatus, Service } from './types';

export const PIPELINE_STAGES: { value: PipelineStage; label: string }[] = [
  { value: 'lead', label: 'Lead' },
  { value: 'trial', label: 'Trial' },
  { value: 'active', label: 'Active' },
  { value: 'at_risk', label: 'At Risk' },
  { value: 'lapsed', label: 'Lapsed' },
  { value: 'churned', label: 'Churned' },
];

export const CONTACT_SOURCES: { value: ContactSource; label: string }[] = [
  { value: 'instagram', label: 'Instagram' },
  { value: 'walk_in', label: 'Walk-in' },
  { value: 'referral', label: 'Referral' },
  { value: 'classpass', label: 'ClassPass' },
  { value: 'entertainer', label: 'Entertainer' },
  { value: 'corporate', label: 'Corporate' },
  { value: 'other', label: 'Other' },
];

export const INTERACTION_CHANNELS: { value: InteractionChannel; label: string }[] = [
  { value: 'dm', label: 'Instagram DM' },
  { value: 'call', label: 'Phone Call' },
  { value: 'email', label: 'Email' },
  { value: 'in_person', label: 'In Person' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'other', label: 'Other' },
];

export const SERVICES: { value: Service; label: string }[] = [
  { value: 'sauna', label: 'Sauna' },
  { value: 'ice_bath', label: 'Ice Bath' },
  { value: 'magnesium_bath', label: 'Magnesium Bath' },
  { value: 'cafe', label: 'Cafe' },
  { value: 'other', label: 'Other' },
];

export const ITEM_TYPES: { value: ItemType; label: string }[] = [
  { value: 'trial', label: 'Trial' },
  { value: 'single_session', label: 'Single Session' },
  { value: 'session_pack', label: 'Session Pack' },
  { value: 'membership', label: 'Membership' },
];

export const PURCHASE_STATUSES: { value: PurchaseStatus; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'used_up', label: 'Used up' },
  { value: 'expired', label: 'Expired' },
  { value: 'cancelled', label: 'Cancelled' },
];

export const STAGE_BADGE_CLASSES: Record<PipelineStage, string> = {
  lead: 'bg-slate-700 text-slate-200',
  trial: 'bg-blue-500/20 text-blue-300',
  active: 'bg-emerald-500/20 text-emerald-300',
  at_risk: 'bg-amber-500/20 text-amber-300',
  lapsed: 'bg-orange-500/20 text-orange-300',
  churned: 'bg-red-500/20 text-red-300',
};

export const PURCHASE_STATUS_BADGE_CLASSES: Record<PurchaseStatus, string> = {
  active: 'bg-emerald-500/20 text-emerald-300',
  used_up: 'bg-slate-700 text-slate-300',
  expired: 'bg-orange-500/20 text-orange-300',
  cancelled: 'bg-red-500/20 text-red-300',
};

export const DISCOUNT_TYPES: { value: DiscountType; label: string }[] = [
  { value: 'percentage', label: 'Percentage off' },
  { value: 'fixed', label: 'Fixed amount off' },
  { value: 'full_comp', label: 'Full comp (free)' },
];

export const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'cash', label: 'Cash' },
  { value: 'stripe', label: 'Stripe' },
];
