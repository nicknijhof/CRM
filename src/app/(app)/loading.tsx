export default function Loading() {
  return (
    <div className="max-w-6xl animate-pulse space-y-6" aria-busy="true" aria-label="Loading">
      <div className="h-7 w-48 rounded-lg bg-stone-200" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="h-24 rounded-xl bg-stone-200" />
        <div className="h-24 rounded-xl bg-stone-200" />
        <div className="h-24 rounded-xl bg-stone-200" />
      </div>
      <div className="h-72 rounded-xl bg-stone-200" />
    </div>
  );
}
