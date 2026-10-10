import { requireBusiness } from '@/lib/businessAuth';
import type { Partner } from '@/lib/types';
import PartnerCard from '@/components/business/PartnerCard';
import PartnerForm from '@/components/business/PartnerForm';
import { PageHeader } from '@/components/business/ui';
import { createPartner } from './actions';

export default async function PartnershipsPage() {
  const supabase = await requireBusiness();
  const { data } = await supabase.from('partners').select('*').order('name').returns<Partner[]>();
  const partners = data ?? [];
  const ongoing = partners.filter((p) => p.arrangement === 'ongoing' && p.status !== 'ended');
  const oneOff = partners.filter((p) => p.arrangement === 'one_off' && p.status !== 'ended');
  const ended = partners.filter((p) => p.status === 'ended');

  return (
    <div className="max-w-4xl space-y-6">
      <PageHeader
        title="Partnerships"
        intro="The gyms and companies we have deals with: who they are, what the deal is and how it works day to day. One-off collaborations and events are kept here too."
      />

      <details className="rounded-xl border border-stone-200 bg-white" open={partners.length === 0}>
        <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-teal-700">+ Add a partner</summary>
        <div className="border-t border-stone-200 p-4">
          <PartnerForm action={createPartner} submitLabel="Add partner" />
        </div>
      </details>

      <Section title="Ongoing deals" partners={ongoing} empty="No ongoing deals added yet." />
      <Section title="One-offs" partners={oneOff} empty="No one-off collaborations yet." />
      {ended.length > 0 && <Section title="Ended" partners={ended} />}
    </div>
  );
}

function Section({ title, partners, empty }: { title: string; partners: Partner[]; empty?: string }) {
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold text-stone-600">
        {title} <span className="font-normal text-stone-400">({partners.length})</span>
      </h2>
      {partners.map((p) => (
        <PartnerCard key={p.id} partner={p} />
      ))}
      {!partners.length && empty && <p className="text-sm text-stone-500">{empty}</p>}
    </section>
  );
}
