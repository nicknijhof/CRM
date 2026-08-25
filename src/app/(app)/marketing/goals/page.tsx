import { createClient } from '@/lib/supabase/server';
import type { Contact } from '@/lib/types';
import GoalOutreachView from '@/components/GoalOutreachView';

export default async function MemberGoalsPage() {
  const supabase = await createClient();
  const { data: contacts } = await supabase
    .from('contacts')
    .select('id, full_name, email, phone, primary_goal, primary_goal_other')
    .order('full_name')
    .returns<Pick<Contact, 'id' | 'full_name' | 'email' | 'phone' | 'primary_goal' | 'primary_goal_other'>[]>();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-stone-900">Member Goals</h1>
        <p className="mt-1 text-sm text-stone-500">
          Segment members by their stated reason for joining, then reach out by WhatsApp or email.
        </p>
      </div>

      <GoalOutreachView contacts={contacts ?? []} />
    </div>
  );
}
