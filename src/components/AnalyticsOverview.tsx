import MonthlyTrendChart from './charts/MonthlyTrendChart';
import type { CohortConversionPoint, PackSalesPoint } from '@/lib/analytics';

export default function AnalyticsOverview({
  newMembers30d,
  cancellations30d,
  trialConversionRate,
  followUpReturn,
  conversionTrend,
  packSalesTrend,
  packNames,
}: {
  newMembers30d: number;
  cancellations30d: number;
  trialConversionRate: number;
  followUpReturn: { total: number; returned: number; rate: number | null };
  conversionTrend: CohortConversionPoint[];
  packSalesTrend: PackSalesPoint[];
  packNames: string[];
}) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500">Growth &amp; retention</h2>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Kpi label="New members (30d)" value={newMembers30d} />
        <Kpi
          label="Cancellations (30d)"
          value={cancellations30d}
          accent={cancellations30d > 0 ? 'text-rose-600' : undefined}
        />
        <Kpi label="Trial → active rate" value={`${trialConversionRate}%`} />
        <Kpi
          label="Messaged → returned in 7d"
          value={followUpReturn.rate !== null ? `${followUpReturn.rate}%` : '—'}
          sub={
            followUpReturn.total
              ? `${followUpReturn.returned} of ${followUpReturn.total} follow-ups`
              : 'No follow-ups logged yet'
          }
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-xl border border-stone-200 bg-white p-4">
          <h3 className="text-sm font-semibold text-stone-700">Conversion by signup month</h3>
          <p className="text-xs text-stone-500">% of each month&apos;s new signups who are active members today</p>
          <MonthlyTrendChart data={conversionTrend} series={[{ key: 'rate', label: '% converted' }]} />
        </div>
        <div className="rounded-xl border border-stone-200 bg-white p-4">
          <h3 className="text-sm font-semibold text-stone-700">Session pack sales</h3>
          <p className="text-xs text-stone-500">Top-selling packs, last {packSalesTrend.length} months</p>
          {packNames.length ? (
            <MonthlyTrendChart data={packSalesTrend} series={packNames.map((name) => ({ key: name, label: name }))} />
          ) : (
            <p className="mt-16 text-center text-sm text-stone-400">No pack sales yet</p>
          )}
        </div>
      </div>
    </div>
  );
}

function Kpi({ label, value, accent, sub }: { label: string; value: string | number; accent?: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-4">
      <p className="text-xs text-stone-500">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${accent ?? 'text-stone-900'}`}>{value}</p>
      {sub && <p className="mt-0.5 text-[11px] text-stone-400">{sub}</p>}
    </div>
  );
}
