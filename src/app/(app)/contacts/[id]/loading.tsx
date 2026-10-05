export default function Loading() {
  return (
    <div className="max-w-6xl animate-pulse" aria-busy="true" aria-label="Loading member">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <aside className="lg:order-2 lg:col-span-1">
          <div className="h-72 rounded-xl bg-stone-200" />
        </aside>
        <div className="space-y-8 lg:order-1 lg:col-span-2">
          <div className="h-28 rounded-xl bg-stone-200" />
          <div className="h-12 rounded-xl bg-stone-200" />
          <div className="h-56 rounded-xl bg-stone-200" />
        </div>
      </div>
    </div>
  );
}
