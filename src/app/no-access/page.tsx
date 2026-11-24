export default function NoAccess() {
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="card max-w-sm text-center">
        <h1 className="font-serif text-2xl">No access yet</h1>
        <p className="mt-2 text-sm text-ink-muted">Your account is signed in but hasn&apos;t been added to the business. Ask the owner to add you in Settings.</p>
        <form action="/logout" method="post" className="mt-4"><button className="btn-ghost">Sign out</button></form>
      </div>
    </main>
  );
}
