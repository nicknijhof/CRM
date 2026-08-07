import Image from 'next/image';
import { signIn } from './actions';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-stone-50 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-stone-200 bg-white p-8 shadow-xl">
        <div className="flex items-center gap-3">
          <Image
            src="/logo.jpg"
            alt="Sochill Bath Club"
            width={56}
            height={56}
            className="rounded-xl"
          />
          <h1 className="text-xl font-semibold text-stone-900">Sochill CRM</h1>
        </div>
        <p className="mt-4 text-sm text-stone-500">Sign in to continue</p>

        <form action={signIn} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm text-stone-700" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-stone-900 outline-none focus:border-teal-500"
            />
          </div>
          <div>
            <label className="block text-sm text-stone-700" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-stone-900 outline-none focus:border-teal-500"
            />
          </div>

          {error && <p className="text-sm text-rose-600">{error}</p>}

          <button
            type="submit"
            className="w-full rounded-lg bg-teal-600 px-3 py-2 font-medium text-white transition hover:bg-teal-700"
          >
            Sign in
          </button>
        </form>
      </div>
    </div>
  );
}
