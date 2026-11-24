import Link from "next/link";
import { notFound } from "next/navigation";
import { AgeBadge } from "@/components/AgeBadge";
import { Flash, PageHeader, Stat } from "@/components/ui";
import { StockForm } from "@/components/StockForm";
import { SubmitButton } from "@/components/SubmitButton";
import { requireMember } from "@/lib/auth";
import { fetchAll } from "@/lib/finance";
import { count, naira, shortDate, todayLagos, daysSince } from "@/lib/format";
import { ageOf, stockByProduct } from "@/lib/inventory";
import { addStock, deleteMovement } from "../actions";

type Line = { date: string; at: string; what: string; detail: string; change: number; cost?: number | null; link?: string; moveId?: string };

export default async function StockCard({ params, searchParams }: { params: { productId: string }; searchParams: { error?: string; ok?: string } }) {
  const { supabase, settings, member } = await requireMember();
  const all = await stockByProduct(supabase, true);
  const p = all.find((x) => x.id === params.productId);
  if (!p) notFound();
  const [moves, sales, { data: batches }] = await Promise.all([
    fetchAll<{ id: string; moved_on: string; created_at: string; kind: string; crates: number; unit_cost: number | null; notes: string | null; purchase_id: string | null; suppliers: { name: string } | null }>((a, b) =>
      supabase.from("stock_movements").select("id, moved_on, created_at, kind, crates, unit_cost, notes, purchase_id, suppliers(name)").eq("product_id", p.id).range(a, b) as never),
    fetchAll<{ id: string; sale_date: string; created_at: string; crates: number; customers: { name: string } | null }>((a, b) =>
      supabase.from("sales").select("id, sale_date, created_at, crates, customers(name)").eq("product_id", p.id).range(a, b) as never),
    supabase.from("stock_batches").select("id, moved_on, crates_in, crates_left, unit_cost").eq("product_id", p.id).gt("crates_left", 0).order("moved_on"),
  ]);

  const lines: Line[] = [
    ...moves.map((m) => ({
      date: m.moved_on, at: m.created_at, moveId: m.purchase_id ? undefined : m.id, cost: m.unit_cost,
      link: m.purchase_id ? `/purchases/${m.purchase_id}` : undefined,
      what: { in: "Received", opening: "Old stock", spoilt: "Spoilt", adjust: "Count correction" }[m.kind] ?? m.kind,
      detail: [m.suppliers?.name, m.notes].filter(Boolean).join(" · "),
      change: m.kind === "spoilt" ? -m.crates : m.crates,
    })),
    ...sales.map((s) => ({ date: s.sale_date, at: s.created_at, what: "Sold", detail: s.customers?.name ?? "", change: -s.crates, link: `/sales/${s.id}` })),
  ].sort((a, b) => (a.date === b.date ? a.at.localeCompare(b.at) : a.date.localeCompare(b.date)));
  let run = 0;
  const withBal = lines.map((l) => ({ ...l, bal: (run += l.change) })).reverse();
  const age = ageOf(p.oldest_batch, p.on_hand, settings.aging_days, settings.old_days);
  const here = `/stock/${p.id}`;

  return (
    <div className="space-y-4">
      <PageHeader title={`${p.name} eggs`} sub="Stock card: everything in and out" action={<AgeBadge age={age} />} />
      <Flash error={searchParams.error} ok={searchParams.ok} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="In store now" value={count(p.on_hand)} tone={p.on_hand <= p.low_stock_level ? "red" : "brand"} note={`Warn below ${p.low_stock_level}`} />
        <Stat label="Received (all time)" value={count(p.crates_in)} tone="ink" />
        <Stat label="Sold (all time)" value={count(p.crates_sold)} />
        <Stat label="Spoilt (all time)" value={count(p.crates_spoilt)} tone="amber" />
      </div>

      {batches && batches.length > 0 && (
        <div className="card">
          <div className="mb-2 font-medium">Batches still in the store</div>
          <div className="space-y-2">
            {batches.map((b) => {
              const d = daysSince(b.moved_on) ?? 0;
              return (
                <div key={b.id} className="flex items-center justify-between text-sm">
                  <span>{shortDate(b.moved_on)} <span className={`ml-1 text-xs ${d >= settings.old_days ? "text-red-600" : d >= settings.aging_days ? "text-amber-600" : "text-ink-muted"}`}>{d} days old</span></span>
                  <span className="tabular-nums">{count(b.crates_left)} of {count(b.crates_in)} left{member.role === "owner" && b.unit_cost != null ? ` · ${naira(b.unit_cost)}/crate` : ""}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="card p-0 sm:p-0">
          <div className="px-4 pt-4 font-medium">History</div>
          {withBal.length === 0 ? <p className="p-4 text-sm text-ink-muted">Nothing yet. Receive stock or add old stock to start.</p> : (
            <div className="table-wrap sm:mx-0"><table className="tbl">
              <thead><tr><th>Date</th><th>What</th><th className="num">In / out</th><th className="num">Left</th>{member.role === "owner" && <th></th>}</tr></thead>
              <tbody>{withBal.slice(0, 300).map((l, i) => (
                <tr key={i}>
                  <td className="text-ink-muted">{shortDate(l.date)}</td>
                  <td>{l.link ? <Link href={l.link} className="font-medium">{l.what}</Link> : l.what}{l.detail && <div className="text-xs text-ink-muted">{l.detail}</div>}</td>
                  <td className={`num ${l.change > 0 ? "text-brand-600" : "text-amber-600"}`}>{l.change > 0 ? "+" : ""}{count(l.change)}</td>
                  <td className="num font-medium">{count(l.bal)}</td>
                  {member.role === "owner" && <td>{l.moveId && <form action={deleteMovement}><input type="hidden" name="id" value={l.moveId} /><input type="hidden" name="from" value={here} /><SubmitButton className="text-xs text-red-600">Delete</SubmitButton></form>}</td>}
                </tr>
              ))}</tbody>
            </table></div>
          )}
        </div>
        <div className="card"><div className="mb-3 font-medium">Update {p.name}</div><StockForm action={addStock} today={todayLagos()} products={[]} productId={p.id} from={here} /></div>
      </div>
    </div>
  );
}
