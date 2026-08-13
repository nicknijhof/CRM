import type {
  ContactSource,
  DiscountType,
  InteractionChannel,
  ItemType,
  PaymentMethod,
  PipelineStage,
  PurchaseStatus,
  Service,
} from './types';

export const PIPELINE_STAGES: { value: PipelineStage; label: string }[] = [
  { value: 'lead', label: 'Paused' },
  { value: 'trial', label: 'Trial' },
  { value: 'active', label: 'Active' },
  { value: 'at_risk', label: 'At Risk' },
  { value: 'lapsed', label: 'Expired' },
  { value: 'churned', label: 'Cancelled' },
];

export const CONTACT_SOURCES: { value: ContactSource; label: string }[] = [
  { value: 'instagram', label: 'Instagram' },
  { value: 'walk_in', label: 'Walk-in' },
  { value: 'referral', label: 'Referral' },
  { value: 'classpass', label: 'ClassPass' },
  { value: 'entertainer', label: 'Entertainer' },
  { value: 'corporate', label: 'Corporate' },
  { value: 'staff', label: 'Staff' },
  { value: 'whatsapp', label: 'WhatsApp' },
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
  { value: 'gift_card', label: 'Gift Card' },
];

export const PURCHASE_STATUSES: { value: PurchaseStatus; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'paused', label: 'Paused' },
  { value: 'used_up', label: 'Used up' },
  { value: 'expired', label: 'Expired' },
  { value: 'cancelled', label: 'Cancelled' },
];

export const STAGE_BADGE_CLASSES: Record<PipelineStage, string> = {
  lead: 'bg-stone-200 text-stone-700',
  trial: 'bg-sky-100 text-sky-700',
  active: 'bg-emerald-100 text-emerald-700',
  at_risk: 'bg-amber-100 text-amber-800',
  lapsed: 'bg-orange-100 text-orange-700',
  churned: 'bg-rose-100 text-rose-700',
};

export const PURCHASE_STATUS_BADGE_CLASSES: Record<PurchaseStatus, string> = {
  active: 'bg-emerald-100 text-emerald-700',
  paused: 'bg-sky-100 text-sky-700',
  used_up: 'bg-stone-200 text-stone-600',
  expired: 'bg-orange-100 text-orange-700',
  cancelled: 'bg-rose-100 text-rose-700',
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
