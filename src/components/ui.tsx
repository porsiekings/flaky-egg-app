import Link from "next/link";

export function PageHeader({ title, sub, action }: { title: string; sub?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="h1">{title}</h1>
        {sub && <p className="mt-1 text-sm text-ink-muted">{sub}</p>}
      </div>
      {action}
    </div>
  );
}

export function Stat({ label, value, note, tone = "brand" }: { label: string; value: React.ReactNode; note?: React.ReactNode; tone?: "brand" | "amber" | "ink" | "red" }) {
  const bar = { brand: "from-brand-500", amber: "from-amber-500", ink: "from-indigo-400", red: "from-red-500" }[tone];
  return (
    <div className="card relative overflow-hidden">
      <div className={`absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r ${bar} to-transparent`} />
      <div className="text-xs text-ink-muted">{label}</div>
      <div className="mt-1 font-serif text-2xl tabular-nums sm:text-[28px]">{value}</div>
      {note && <div className="mt-1 text-xs text-ink-muted">{note}</div>}
    </div>
  );
}

export function Flash({ error, ok }: { error?: string; ok?: string }) {
  if (!error && !ok) return null;
  return (
    <p className={`mb-4 rounded-xl px-3 py-2 text-sm ${error ? "bg-red-50 text-red-700" : "bg-brand-50 text-brand-700"}`}>{error ?? ok}</p>
  );
}

export function Empty({ title, text, href, cta }: { title: string; text: string; href?: string; cta?: string }) {
  return (
    <div className="card py-10 text-center">
      <div className="font-serif text-lg">{title}</div>
      <p className="mx-auto mt-1 max-w-xs text-sm text-ink-muted">{text}</p>
      {href && cta && <Link href={href} className="btn-primary mt-4">{cta}</Link>}
    </div>
  );
}

export function AddButton({ href, children }: { href: string; children: React.ReactNode }) {
  return <Link href={href} className="btn-primary">＋ {children}</Link>;
}

export function Paid({ due }: { due: number }) {
  if (due <= 0) return <span className="pill-ok">Paid</span>;
  return <span className="pill-warn">Owes</span>;
}
