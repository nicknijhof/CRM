'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { CafeOrder, CafeOrderItem, CafeOrderItemAddon, CafeOrderStatus } from '@/lib/types';

export type OrderWithItems = CafeOrder & { contactName: string; items: (CafeOrderItem & { addons: CafeOrderItemAddon[] })[] };

const ACTIVE_STATUSES: CafeOrderStatus[] = ['received', 'preparing', 'ready'];
const POLL_INTERVAL_MS = 5000;

const STATUS_LABEL: Record<CafeOrderStatus, string> = {
  received: 'Received',
  preparing: 'Preparing',
  ready: 'Ready',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

const STATUS_CLASSES: Record<CafeOrderStatus, string> = {
  received: 'bg-amber-100 text-amber-700',
  preparing: 'bg-sky-100 text-sky-700',
  ready: 'bg-emerald-100 text-emerald-700',
  completed: 'bg-stone-200 text-stone-600',
  cancelled: 'bg-rose-100 text-rose-700',
};

// The next status a staff member would advance an order to, and the action label.
const NEXT_STATUS: Partial<Record<CafeOrderStatus, { next: CafeOrderStatus; label: string }>> = {
  received: { next: 'preparing', label: 'Start preparing' },
  preparing: { next: 'ready', label: 'Mark ready' },
  ready: { next: 'completed', label: 'Mark picked up' },
};

// A short, dependency-free "new order" chime using the Web Audio API — no
// audio file to host. Must be called after a user gesture (see the "Enable
// sound alerts" button) since iPad/Safari blocks audio until then.
function playChime() {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const now = ctx.currentTime;
    [880, 1320].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = freq;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.0001, now + i * 0.15);
      gain.gain.exponentialRampToValueAtTime(0.3, now + i * 0.15 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.15 + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.15);
      osc.stop(now + i * 0.15 + 0.4);
    });
  } catch {
    // Web Audio unsupported/blocked — silently skip, the visual alert still shows.
  }
}

async function fetchActiveOrders(supabase: ReturnType<typeof createClient>): Promise<OrderWithItems[]> {
  const { data: orders } = await supabase
    .from('cafe_orders')
    .select('*')
    .in('status', ACTIVE_STATUSES)
    .order('created_at', { ascending: true })
    .returns<CafeOrder[]>();

  const orderIds = (orders ?? []).map((o) => o.id);
  const [{ data: items }, { data: contacts }] = await Promise.all([
    orderIds.length
      ? supabase.from('cafe_order_items').select('*').in('order_id', orderIds).returns<CafeOrderItem[]>()
      : Promise.resolve({ data: [] as CafeOrderItem[] }),
    orderIds.length
      ? supabase
          .from('contacts')
          .select('id, full_name')
          .in('id', [...new Set((orders ?? []).map((o) => o.contact_id))])
          .returns<{ id: string; full_name: string }[]>()
      : Promise.resolve({ data: [] as { id: string; full_name: string }[] }),
  ]);

  const itemIds = (items ?? []).map((i) => i.id);
  const { data: addons } = itemIds.length
    ? await supabase.from('cafe_order_item_addons').select('*').in('order_item_id', itemIds).returns<CafeOrderItemAddon[]>()
    : { data: [] as CafeOrderItemAddon[] };

  const nameById = new Map((contacts ?? []).map((c) => [c.id, c.full_name]));
  const addonsByItem = new Map<string, CafeOrderItemAddon[]>();
  for (const a of addons ?? []) {
    const list = addonsByItem.get(a.order_item_id) ?? [];
    list.push(a);
    addonsByItem.set(a.order_item_id, list);
  }
  const itemsByOrder = new Map<string, (CafeOrderItem & { addons: CafeOrderItemAddon[] })[]>();
  for (const item of items ?? []) {
    const list = itemsByOrder.get(item.order_id) ?? [];
    list.push({ ...item, addons: addonsByItem.get(item.id) ?? [] });
    itemsByOrder.set(item.order_id, list);
  }

  return (orders ?? []).map((o) => ({
    ...o,
    contactName: nameById.get(o.contact_id) ?? 'Member',
    items: itemsByOrder.get(o.id) ?? [],
  }));
}

export default function CafeOrdersLiveFeed({ initialOrders }: { initialOrders: OrderWithItems[] }) {
  const [orders, setOrders] = useState<OrderWithItems[]>(initialOrders);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [flashOrderId, setFlashOrderId] = useState<string | null>(null);
  const soundEnabledRef = useRef(soundEnabled);
  const orderIdsRef = useRef(new Set(initialOrders.map((o) => o.id)));

  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
  }, [soundEnabled]);

  const mergeOrders = useCallback((fresh: OrderWithItems[]) => {
    const freshIds = new Set(fresh.map((o) => o.id));
    const newlyArrived = fresh.filter((o) => !orderIdsRef.current.has(o.id));
    orderIdsRef.current = freshIds;
    setOrders(fresh);
    if (newlyArrived.length > 0) {
      setFlashOrderId(newlyArrived[0].id);
      setTimeout(() => setFlashOrderId((id) => (id === newlyArrived[0].id ? null : id)), 3000);
      if (soundEnabledRef.current) playChime();
    }
  }, []);

  // Polling is the reliable path — a live feed just needs to be "current
  // within a few seconds", not millisecond-instant, and it works regardless
  // of whether the project's realtime config cooperates.
  useEffect(() => {
    const supabase = createClient();
    const interval = setInterval(async () => {
      const fresh = await fetchActiveOrders(supabase);
      mergeOrders(fresh);
    }, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [mergeOrders]);

  // Realtime is a bonus for near-instant delivery when it's available — if the
  // project's realtime config doesn't cooperate, polling above still covers it.
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel('cafe-orders-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cafe_orders' }, async () => {
        const fresh = await fetchActiveOrders(supabase);
        mergeOrders(fresh);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [mergeOrders]);

  async function advanceStatus(orderId: string, nextStatus: CafeOrderStatus) {
    const supabase = createClient();
    const { error } = await supabase.rpc('set_cafe_order_status', { p_order_id: orderId, p_status: nextStatus });
    if (error) {
      alert(`Could not update order: ${error.message}`);
      return;
    }
    setOrders((prev) => {
      const next =
        nextStatus === 'completed' || nextStatus === 'cancelled'
          ? prev.filter((o) => o.id !== orderId)
          : prev.map((o) => (o.id === orderId ? { ...o, status: nextStatus } : o));
      orderIdsRef.current = new Set(next.map((o) => o.id));
      return next;
    });
  }

  function enableSound() {
    playChime();
    setSoundEnabled(true);
  }

  return (
    <div className="mt-6">
      {!soundEnabled && (
        <button
          onClick={enableSound}
          className="mb-4 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
        >
          🔔 Enable sound alerts
        </button>
      )}
      {soundEnabled && <p className="mb-4 text-xs text-emerald-700">🔔 Sound alerts on — leave this tab open.</p>}

      {orders.length === 0 && <p className="text-sm text-stone-500">No active orders right now.</p>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {orders.map((order) => {
          const action = NEXT_STATUS[order.status];
          return (
            <div
              key={order.id}
              className={`rounded-xl border p-4 transition-colors ${
                flashOrderId === order.id ? 'border-teal-400 bg-teal-50' : 'border-stone-200 bg-white'
              }`}
            >
              <div className="flex items-center justify-between">
                <p className="font-medium text-stone-900">{order.contactName}</p>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CLASSES[order.status]}`}>
                  {STATUS_LABEL[order.status]}
                </span>
              </div>
              <ul className="mt-2 space-y-1 text-sm text-stone-600">
                {order.items.map((item) => (
                  <li key={item.id}>
                    {item.quantity}× {item.item_name}
                    {item.variant_names && item.variant_names.length > 0 && (
                      <span className="text-stone-500"> ({item.variant_names.join(', ')})</span>
                    )}
                    {item.addons.length > 0 && (
                      <span className="block pl-4 text-xs text-stone-400">
                        + {item.addons.map((a) => a.addon_name).join(', ')}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-stone-400">
                {new Date(order.created_at).toLocaleTimeString('en-SG', { hour: '2-digit', minute: '2-digit' })} · SGD{' '}
                {order.total_amount.toFixed(2)}
                {order.member_discount_percent > 0 && (
                  <span className="text-emerald-600"> ({order.member_discount_percent}% member discount applied)</span>
                )}
              </p>
              {action && (
                <button
                  onClick={() => advanceStatus(order.id, action.next)}
                  className="mt-3 w-full rounded-lg bg-teal-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-teal-700"
                >
                  {action.label}
                </button>
              )}
              {order.status !== 'cancelled' && (
                <button
                  onClick={() => advanceStatus(order.id, 'cancelled')}
                  className="mt-1.5 w-full text-xs text-rose-600 underline hover:text-rose-700"
                >
                  Cancel order
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
