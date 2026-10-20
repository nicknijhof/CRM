// PostgREST caps a single response at 1000 rows, so anything meant to return "everything" loops in
// batches. Give each query a stable .order() so the batches never overlap or skip rows.
export async function fetchAll<T>(
  make: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
): Promise<T[]> {
  const BATCH = 1000;
  const all: T[] = [];
  for (let from = 0; ; from += BATCH) {
    const { data, error } = await make(from, from + BATCH - 1);
    if (error) throw new Error(error.message);
    all.push(...(data ?? []));
    if ((data?.length ?? 0) < BATCH) break;
  }
  return all;
}
