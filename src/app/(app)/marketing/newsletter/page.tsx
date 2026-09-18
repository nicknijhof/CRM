import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { canSendNewsletter, getCurrentRole } from '@/lib/profile';
import { formatSGDateTime } from '@/lib/format';
import NewsletterForm from '@/components/NewsletterForm';

type NewsletterRow = {
  id: string;
  subject: string;
  body: string;
  recipient_count: number;
  created_at: string;
};

export default async function NewsletterPage() {
  const supabase = await createClient();
  const role = await getCurrentRole(supabase);
  if (!canSendNewsletter(role)) redirect('/');

  const [{ count: contactCount }, { data: recent }] = await Promise.all([
    supabase.from('contacts').select('id', { count: 'exact', head: true }).not('email', 'is', null).neq('email', ''),
    supabase
      .from('newsletter_broadcasts')
      .select('id, subject, body, recipient_count, created_at')
      .order('created_at', { ascending: false })
      .limit(20)
      .returns<NewsletterRow[]>(),
  ]);

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold text-stone-900">Newsletter</h1>
      <p className="mt-1 text-sm text-stone-500">
        Send a marketing email to every contact with an address on file —{' '}
        <span className="font-medium text-stone-700">{contactCount ?? 0}</span> right now.
      </p>

      <NewsletterForm contactCount={contactCount ?? 0} />

      <section className="mt-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500">Sent</h2>
        <div className="mt-3 space-y-2">
          {recent?.length ? (
            recent.map((n) => (
              <div key={n.id} className="rounded-lg border border-stone-200 px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-medium text-stone-900">{n.subject}</p>
                  <span className="shrink-0 text-xs text-stone-400">{formatSGDateTime(n.created_at)}</span>
                </div>
                <p className="mt-0.5 line-clamp-2 text-sm text-stone-600">{n.body}</p>
                <p className="mt-1 text-xs text-stone-400">
                  Reached {n.recipient_count} contact{n.recipient_count === 1 ? '' : 's'}
                </p>
              </div>
            ))
          ) : (
            <p className="text-sm text-stone-400">Nothing sent yet.</p>
          )}
        </div>
      </section>
    </div>
  );
}
