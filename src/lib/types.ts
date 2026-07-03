export type PipelineStage = 'lead' | 'trial' | 'active' | 'at_risk' | 'lapsed' | 'churned';

export type ContactSource = 'instagram' | 'walk_in' | 'referral' | 'classpass' | 'corporate' | 'other';

export type InteractionChannel = 'dm' | 'call' | 'email' | 'in_person' | 'whatsapp' | 'other';

export type Service = 'sauna' | 'ice_bath' | 'magnesium_bath' | 'cafe' | 'other';

export type MembershipStatus = 'trial' | 'active' | 'expired' | 'cancelled';

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
  created_at: string;
  updated_at: string;
}

export interface Membership {
  id: string;
  contact_id: string;
  plan_name: string;
  status: MembershipStatus;
  start_date: string | null;
  end_date: string | null;
  price: number | null;
  billing_period: string | null;
  arketa_id: string | null;
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
}

export interface Interaction {
  id: string;
  contact_id: string;
  channel: InteractionChannel;
  note: string;
  staff_id: string | null;
  created_at: string;
}

export interface Profile {
  id: string;
  full_name: string | null;
  role: 'admin' | 'owner';
  created_at: string;
}
