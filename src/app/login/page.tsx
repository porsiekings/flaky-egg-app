import { signIn } from "./actions";

export default function LoginPage({ searchParams }: { searchParams: { error?: string } }) {
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="card w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-500 text-2xl text-white shadow-card">🥚</div>
          <h1 className="font-serif text-2xl">Flaky Egg Distributor</h1>
          <p className="mt-1 text-sm text-ink-muted">Sign in to manage sales and stock</p>
        </div>
        <form action={signIn} className="space-y-4">
          <div>
            <label className="label" htmlFor="email">Email</label>
            <input className="input" id="email" name="email" type="email" autoComplete="email" required />
          </div>
          <div>
            <label className="label" htmlFor="password">Password</label>
            <input className="input" id="password" name="password" type="password" autoComplete="current-password" required />
          </div>
          {searchParams.error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{searchParams.error}</p>}
          <button className="btn-primary w-full">Sign in</button>
        </form>
      </div>
    </main>
  );
}
