import { createClient } from '@/lib/supabase/server';
import type { CafeOrder, CafeOrderItem, CafeOrderItemAddon } from '@/lib/types';
import CafeOrdersLiveFeed, { type OrderWithItems } from '@/components/CafeOrdersLiveFeed';

export default async function CafeOrdersPage() {
  const supabase = await createClient();

  const { data: orders } = await supabase
    .from('cafe_orders')
    .select('*')
    .in('status', ['received', 'preparing', 'ready'])
    .order('created_at', { ascending: true })
    .returns<CafeOrder[]>();

  const orderIds = (orders ?? []).map((o) => o.id);
  const { data: items } = orderIds.length
    ? await supabase.from('cafe_order_items').select('*').in('order_id', orderIds).returns<CafeOrderItem[]>()
    : { data: [] as CafeOrderItem[] };

  const itemIds = (items ?? []).map((i) => i.id);
  const { data: addons } = itemIds.length
    ? await supabase.from('cafe_order_item_addons').select('*').in('order_item_id', itemIds).returns<CafeOrderItemAddon[]>()
    : { data: [] as CafeOrderItemAddon[] };

  const contactIds = [...new Set((orders ?? []).map((o) => o.contact_id))];
  const { data: contacts } = contactIds.length
    ? await supabase.from('contacts').select('id, full_name').in('id', contactIds).returns<{ id: string; full_name: string }[]>()
    : { data: [] as { id: string; full_name: string }[] };

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

  const initialOrders: OrderWithItems[] = (orders ?? []).map((o) => ({
    ...o,
    contactName: nameById.get(o.contact_id) ?? 'Member',
    items: itemsByOrder.get(o.id) ?? [],
  }));

  return (
    <div>
      <h1 className="text-2xl font-semibold text-stone-900">Cafe Orders</h1>
      <p className="mt-1 text-sm text-stone-500">
        Live feed of pickup orders. Leave this page open — new orders alert with a sound.
      </p>
      <CafeOrdersLiveFeed initialOrders={initialOrders} />
    </div>
  );
}
