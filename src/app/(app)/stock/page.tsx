import Link from "next/link";
import { AgeBadge } from "@/components/AgeBadge";
import { Flash, PageHeader, Stat } from "@/components/ui";
import { StockForm } from "@/components/StockForm";
import { requireMember } from "@/lib/auth";
import { count, naira, todayLagos } from "@/lib/format";
import { ageOf, stockByProduct } from "@/lib/inventory";
import { addStock } from "./actions";

export default async function StockPage({ searchParams }: { searchParams: { error?: string; ok?: string } }) {
  const { supabase, settings, member } = await requireMember();
  const products = await stockByProduct(supabase);
  const total = products.reduce((s, p) => s + p.on_hand, 0);
  const value = products.reduce((s, p) => s + p.stock_value, 0);
  const incoming = products.reduce((s, p) => s + Number(p.incoming), 0);
  const ages = products.map((p) => ({ p, age: ageOf(p.oldest_batch, p.on_hand, settings.aging_days, settings.old_days) }));
  const oldOnes = ages.filter((a) => a.age.level === "old" || a.age.level === "aging");
  const lowOnes = products.filter((p) => p.on_hand <= p.low_stock_level);

  return (
    <div className="space-y-4">
      <PageHeader title="Stock" sub="What's in the store, by egg size" action={<Link href="/purchases/new" className="btn-primary">＋ Receive stock</Link>} />
      <Flash error={searchParams.error} ok={searchParams.ok} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Crates in store" value={count(total)} />
        {member.role === "owner" ? <Stat label="Stock value" value={naira(value)} tone="ink" note="What she paid for what's left" /> : <Stat label="Sizes" value={products.length} tone="ink" />}
        <Stat label="Coming in" value={count(incoming)} tone="ink" note={<Link href="/purchases" className="text-brand-600">Expected deliveries ›</Link>} />
        <Stat label="Need attention" value={oldOnes.length + lowOnes.length} tone={oldOnes.length + lowOnes.length ? "amber" : "brand"} note={`${oldOnes.length} ageing · ${lowOnes.length} low`} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {ages.map(({ p, age }) => {
          const low = p.on_hand <= p.low_stock_level;
          return (
            <Link key={p.id} href={`/stock/${p.id}`} className="card block transition hover:-translate-y-0.5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-xs uppercase tracking-wider text-ink-muted">{p.name}</div>
                  <div className={`font-serif text-4xl tabular-nums ${low ? "text-red-600" : ""}`}>{count(p.on_hand)}</div>
                  <div className="text-xs text-ink-muted">crates{low ? " · low, restock" : ""}</div>
                </div>
                <AgeBadge age={age} />
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 border-t border-ink-line pt-3 text-xs">
                <div><div className="text-ink-muted">Sells at</div><div className="tabular-nums">{naira(p.sell_price)}</div></div>
                <div><div className="text-ink-muted">Avg cost</div><div className="tabular-nums">{p.avg_cost != null ? naira(p.avg_cost) : "—"}</div></div>
                <div><div className="text-ink-muted">Incoming</div><div className="tabular-nums">{count(p.incoming)}</div></div>
              </div>
              {Number(p.on_order_to_customers) > 0 && <div className="mt-2 text-xs text-amber-600">{count(p.on_order_to_customers)} crates promised to customers</div>}
            </Link>
          );
        })}
      </div>

      <div className="card">
        <div className="mb-3 font-medium">Other stock changes</div>
        <StockForm action={addStock} today={todayLagos()} products={products} />
      </div>
      <p className="text-xs text-ink-muted">Eggs are counted as sold oldest first. A batch is marked &ldquo;sell first&rdquo; at {settings.aging_days} days and &ldquo;old&rdquo; at {settings.old_days} days (change in Settings). Tap a size to see its full in-and-out history.</p>
    </div>
  );
}
