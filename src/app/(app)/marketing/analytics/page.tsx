import { createClient } from '@/lib/supabase/server';
import type { Contact, Purchase } from '@/lib/types';
import {
  cancellationsCount,
  conversionByCohortMonth,
  followUpReturnRate,
  newMembersCount,
  packSalesByMonth,
  trialToActiveRate,
} from '@/lib/analytics';
import AnalyticsOverview from '@/components/AnalyticsOverview';

const ANALYTICS_MONTHS_BACK = 6;
const FOLLOW_UP_RETURN_WINDOW_DAYS = 7;

export default async function AnalyticsPage() {
  const supabase = await createClient();

  const [{ data: contacts }, { data: visits }, { data: purchases }, { data: followUpCompletions }] = await Promise.all([
    supabase.from('contacts').select('*').returns<Contact[]>(),
    supabase.from('visits').select('contact_id, visit_date'),
    supabase.from('purchases').select('*').returns<Purchase[]>(),
    supabase.from('follow_up_completions').select('contact_id, completed_at'),
  ]);

  const allContacts = contacts ?? [];
  const allPurchases = purchases ?? [];

  const newMembers30d = newMembersCount(allPurchases, 30);
  const cancellations30d = cancellationsCount(allPurchases, 30);
  const trialConversionRate = trialToActiveRate(allContacts);
  const followUpReturn = followUpReturnRate(followUpCompletions ?? [], visits ?? [], FOLLOW_UP_RETURN_WINDOW_DAYS);
  const conversionTrend = conversionByCohortMonth(allContacts, ANALYTICS_MONTHS_BACK);
  const { data: packSalesTrend, packNames } = packSalesByMonth(allPurchases, ANALYTICS_MONTHS_BACK);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-stone-900">Analytics</h1>
        <p className="mt-1 text-sm text-stone-500">
          Growth and retention — new members, cancellations, conversion, and pack sales trends.
        </p>
      </div>

      <AnalyticsOverview
        newMembers30d={newMembers30d}
        cancellations30d={cancellations30d}
        trialConversionRate={trialConversionRate}
        followUpReturn={followUpReturn}
        conversionTrend={conversionTrend}
        packSalesTrend={packSalesTrend}
        packNames={packNames}
      />
    </div>
  );
}
