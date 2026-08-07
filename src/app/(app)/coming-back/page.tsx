import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import type { Contact, Purchase } from '@/lib/types';
import { whatsappLink } from '@/lib/whatsapp';

type PausedRow = { purchase: Purchase; contact: Pick<Contact, 'id' | 'full_name' | 'phone'> };

function comeBackMessage(firstName: string, reason: string | null): string {
  const reasonClause = reason ? ` (${reason})` : '';
  return `Hi ${firstName}, hope all is okay — you paused your membership${reasonClause} and we wanted to check in. Look forward to welcoming you back soon! 🧊`;
}

export default async function ComingBackPage() {
  const supabase = await createClient();

  const [{ data: pausedPurchases }, { data: contacts }] = await Promise.all([
    supabase.from('purchases').select('*').eq('is_paused', true).returns<Purchase[]>(),
    supabase.from('contacts').select('id, full_name, phone').returns<Pick<Contact, 'id' | 'full_name' | 'phone'>[]>(),
  ]);

  const contactsById = new Map((contacts ?? []).map((c) => [c.id, c]));

  const rows: PausedRow[] = (pausedPurchases ?? [])
    .map((purchase) => ({ purchase, contact: contactsById.get(purchase.contact_id) }))
    .filter((r): r is PausedRow => Boolean(r.contact));

  const resumingSoon = rows
    .filter((r) => r.purchase.pause_resume_date)
    .sort((a, b) => (a.purchase.pause_resume_date! < b.purchase.pause_resume_date! ? -1 : 1));

  const indefinite = rows.filter((r) => !r.purchase.pause_resume_date);

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-stone-900">Coming Back</h1>
        <p className="mt-1 text-sm text-stone-500">
          Paused memberships — reach out and welcome them back when they&apos;re due to resume.
        </p>
      </div>

      <PausedTable title="Resuming soon" rows={resumingSoon} emptyMessage="Nobody has a scheduled resume date." />
      <PausedTable title="Indefinite pause" rows={indefinite} emptyMessage="Nobody is on an indefinite pause." />
    </div>
  );
}

function PausedTable({ title, rows, emptyMessage }: { title: string; rows: PausedRow[]; emptyMessage: string }) {
  return (
    <div className="overflow-hidden rounded-xl border border-stone-200">
      <div className="border-b border-stone-200 px-4 py-3">
        <h2 className="text-sm font-semibold text-stone-700">{title}</h2>
      </div>
      <table className="w-full text-left text-sm">
        <thead className="bg-stone-100 text-stone-500">
          <tr>
            <th className="px-4 py-3 font-medium">Name</th>
            <th className="px-4 py-3 font-medium">Reason</th>
            <th className="px-4 py-3 font-medium">Resumes</th>
            <th className="px-4 py-3 font-medium">WhatsApp</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-200">
          {rows.map(({ purchase, contact }) => {
            const href = whatsappLink(contact.phone, comeBackMessage(contact.full_name.split(' ')[0], purchase.pause_reason));
            return (
              <tr key={purchase.id} className="bg-white hover:bg-stone-100">
                <td className="px-4 py-3">
                  <Link href={`/contacts/${contact.id}`} className="font-medium text-stone-900 hover:text-teal-600">
                    {contact.full_name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-stone-500">{purchase.pause_reason || '—'}</td>
                <td className="px-4 py-3 text-stone-700">{purchase.pause_resume_date ?? 'Indefinite'}</td>
                <td className="px-4 py-3">
                  {href ? (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-200"
                    >
                      Message
                    </a>
                  ) : (
                    <span className="text-xs text-stone-400">No phone</span>
                  )}
                </td>
              </tr>
            );
          })}
          {!rows.length && (
            <tr>
              <td colSpan={4} className="px-4 py-8 text-center text-stone-400">
                {emptyMessage}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
