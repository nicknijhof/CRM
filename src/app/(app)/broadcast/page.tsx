import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { canSendBroadcasts, getCurrentRole } from '@/lib/profile';
import { formatSGDateTime } from '@/lib/format';
import BroadcastForm from '@/components/BroadcastForm';

type BroadcastRow = {
  id: string;
  title: string;
  body: string;
  recipient_count: number;
  created_at: string;
};

export default async function BroadcastPage() {
  const supabase = await createClient();
  const role = await getCurrentRole(supabase);
  if (!canSendBroadcasts(role)) redirect('/');

  const [{ count: subscriberCount }, { data: recent }] = await Promise.all([
    supabase.from('push_subscriptions').select('id', { count: 'exact', head: true }),
    supabase
      .from('push_broadcasts')
      .select('id, title, body, recipient_count, created_at')
      .order('created_at', { ascending: false })
      .limit(20)
      .returns<BroadcastRow[]>(),
  ]);

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold text-stone-900">Push Notification</h1>
      <p className="mt-1 text-sm text-stone-500">
        Send a push notification straight to the app —{' '}
        <span className="font-medium text-stone-700">{subscriberCount ?? 0}</span> member device
        {subscriberCount === 1 ? '' : 's'} currently have notifications turned on.
      </p>

      <BroadcastForm subscriberCount={subscriberCount ?? 0} />

      <section className="mt-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500">Sent</h2>
        <div className="mt-3 space-y-2">
          {recent?.length ? (
            recent.map((b) => (
              <div key={b.id} className="rounded-lg border border-stone-200 px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-medium text-stone-900">{b.title}</p>
                  <span className="shrink-0 text-xs text-stone-400">{formatSGDateTime(b.created_at)}</span>
                </div>
                <p className="mt-0.5 text-sm text-stone-600">{b.body}</p>
                <p className="mt-1 text-xs text-stone-400">
                  Reached {b.recipient_count} device{b.recipient_count === 1 ? '' : 's'}
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
