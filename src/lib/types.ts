export type PipelineStage = 'lead' | 'trial' | 'active' | 'at_risk' | 'lapsed' | 'churned';

export type ContactSource =
  'instagram' | 'walk_in' | 'referral' | 'classpass' | 'entertainer' | 'corporate' | 'staff' | 'whatsapp' | 'other';

export type DiscountType = 'percentage' | 'fixed' | 'full_comp';

export type InteractionChannel = 'dm' | 'call' | 'email' | 'in_person' | 'whatsapp' | 'other';

export type Service = 'sauna' | 'ice_bath' | 'magnesium_bath' | 'cafe' | 'other';

export type ItemType = 'trial' | 'single_session' | 'session_pack' | 'membership' | 'gift_card';

export type PurchaseStatus = 'active' | 'used_up' | 'expired' | 'cancelled' | 'paused';

export type PaymentMethod = 'cash' | 'stripe';

export interface Contact {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  source: ContactSource;
  pipeline_stage: PipelineStage;
  tags: string[];
  notes: string | null;
  location_id: string;
  arketa_id: string | null;
  marketing_sms_opt_in: boolean;
  marketing_email_opt_in: boolean;
  marketing_whatsapp_opt_in: boolean;
  stripe_customer_id: string | null;
  stripe_payment_method_id: string | null;
  card_brand: string | null;
  card_last4: string | null;
  avatar_url: string | null;
  gender: 'female' | 'male' | 'non_binary' | 'prefer_not_to_say' | null;
  date_of_birth: string | null;
  primary_goal: 'stress_wellbeing' | 'fitness_recovery' | 'hormonal_wellbeing' | 'other' | null;
  primary_goal_other: string | null;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  name: string;
  item_type: ItemType;
  price: number;
  sessions_included: number | null;
  validity_days: number | null;
  billing_period_days: number | null;
  billing_period_months: number | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

export interface Purchase {
  id: string;
  contact_id: string;
  product_id: string | null;
  name: string;
  item_type: ItemType;
  price: number | null;
  list_price: number | null;
  discount_code_id: string | null;
  discount_label: string | null;
  discount_amount: number;
  sessions_total: number | null;
  sessions_remaining: number | null;
  purchase_date: string;
  expiry_date: string | null;
  status: PurchaseStatus;
  used_up_at: string | null;
  cancelled_at: string | null;
  scheduled_cancellation_date: string | null;
  payment_method: PaymentMethod | null;
  amount_paid: number;
  is_gift: boolean;
  gift_recipient_email: string | null;
  gift_code: string | null;
  arketa_id: string | null;
  created_at: string;
  is_paused: boolean;
  pause_reason: string | null;
  pause_started_at: string | null;
  pause_resume_date: string | null;
  stripe_subscription_id: string | null;
  stripe_payment_intent_id: string | null;
}

export interface DiscountCode {
  id: string;
  code: string;
  label: string;
  discount_type: DiscountType;
  value: number;
  bonus_sessions: number;
  single_use: boolean;
  is_gift_code: boolean;
  is_active: boolean;
  redeemed_at: string | null;
  created_at: string;
}

export interface PurchaseAdjustment {
  id: string;
  purchase_id: string;
  delta: number;
  note: string | null;
  staff_id: string | null;
  created_at: string;
}

export interface Visit {
  id: string;
  contact_id: string;
  visit_date: string;
  service: Service;
  duration_minutes: number | null;
  arketa_id: string | null;
  created_at: string;
  checked_out_at: string | null;
}

export interface Interaction {
  id: string;
  contact_id: string;
  channel: InteractionChannel;
  note: string;
  staff_id: string | null;
  created_at: string;
}

export interface InstagramStat {
  id: string;
  stat_date: string;
  followers: number;
  views: number | null;
  reach: number | null;
  interactions: number | null;
  accounts_engaged: number | null;
  profile_visits: number | null;
  external_link_taps: number | null;
  note: string | null;
  recorded_by: string | null;
  created_at: string;
}

export type ProfileRole = 'admin' | 'owner' | 'staff' | 'marketing';

export interface Profile {
  id: string;
  full_name: string | null;
  role: ProfileRole;
  visible_nav_items: string[] | null;
  created_at: string;
}

export type CafeMenuCategory = 'drink' | 'food';

export interface CafeMenuItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category: CafeMenuCategory;
  image_url: string | null;
  is_available: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export type CafeOrderStatus = 'received' | 'preparing' | 'ready' | 'completed' | 'cancelled';

export interface CafeOrderItem {
  id: string;
  order_id: string;
  menu_item_id: string | null;
  item_name: string;
  item_price: number;
  quantity: number;
}

export interface CafeOrder {
  id: string;
  contact_id: string;
  status: CafeOrderStatus;
  total_amount: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}
