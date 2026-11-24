import { Flash, PageHeader, Stat } from "@/components/ui";
import { StockForm } from "@/components/StockForm";
import { SubmitButton } from "@/components/SubmitButton";
import { requireMember } from "@/lib/auth";
import { count, naira, shortDate, todayLagos } from "@/lib/format";
import { addStock, deleteMovement } from "./actions";

type M = { id: string; moved_on: string; kind: string; crates: number; unit_cost: number | null; supplier: string | null; notes: string | null };

export default async function StockPage({ searchParams }: { searchParams: { error?: string; ok?: string } }) {
  const { supabase, settings, member } = await requireMember();
  const monthStart = todayLagos().slice(0, 8) + "01";
  const [{ data: lvl }, { data: moves }, { data: soldMonth }] = await Promise.all([
    supabase.from("stock_level").select("crates_in_stock").maybeSingle(),
    supabase.from("stock_movements").select("id, moved_on, kind, crates, unit_cost, supplier, notes").order("moved_on", { ascending: false }).order("created_at", { ascending: false }).limit(200),
    supabase.from("sales").select("crates").gte("sale_date", monthStart),
  ]);
  const stock = Number(lvl?.crates_in_stock ?? 0);
  const low = stock <= settings.low_stock_level;
  const rows = (moves ?? []) as M[];
  const inMonth = rows.filter((m) => m.kind === "in" && m.moved_on >= monthStart).reduce((s, m) => s + m.crates, 0);
  const spoiltMonth = rows.filter((m) => m.kind === "spoilt" && m.moved_on >= monthStart).reduce((s, m) => s + m.crates, 0);
  const sold = (soldMonth ?? []).reduce((s, r) => s + Number(r.crates), 0);
  const label: Record<string, string> = { in: "Arrived", spoilt: "Spoilt", adjust: "Count correction" };

  return (
    <div className="space-y-4">
      <PageHeader title="Stock" sub={`Started with ${count(settings.opening_stock)} crates (change in Settings)`} />
      <Flash error={searchParams.error} ok={searchParams.ok} />
      {low && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">Stock is low: {count(stock)} crates left. Time to restock.</p>}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="In stock now" value={count(stock)} tone={low ? "red" : "brand"} note="crates" />
        <Stat label="Arrived this month" value={count(inMonth)} tone="ink" />
        <Stat label="Sold this month" value={count(sold)} tone="brand" />
        <Stat label="Spoilt this month" value={count(spoiltMonth)} tone="amber" />
      </div>
      <div className="grid gap-4 lg:grid-cols-[1fr_1.3fr]">
        <div className="card"><div className="mb-3 font-medium">Update stock</div><StockForm action={addStock} today={todayLagos()} /></div>
        <div className="card p-0 sm:p-0">
          <div className="px-4 pt-4 font-medium">History</div>
          {rows.length === 0 ? <p className="p-4 text-sm text-ink-muted">No stock entries yet. Record your first delivery of crates.</p> : (
            <div className="table-wrap sm:mx-0"><table className="tbl">
              <thead><tr><th>Date</th><th>What</th><th className="num">Crates</th><th className="num">Cost</th>{member.role === "owner" && <th></th>}</tr></thead>
              <tbody>{rows.map((m) => (
                <tr key={m.id}>
                  <td className="text-ink-muted">{shortDate(m.moved_on)}</td>
                  <td>{label[m.kind]}{(m.supplier || m.notes) && <div className="text-xs text-ink-muted">{[m.supplier, m.notes].filter(Boolean).join(" · ")}</div>}</td>
                  <td className={`num ${m.kind === "in" || (m.kind === "adjust" && m.crates > 0) ? "text-brand-600" : "text-amber-600"}`}>{m.kind === "spoilt" ? "−" : m.crates > 0 ? "+" : ""}{count(m.crates)}</td>
                  <td className="num">{m.unit_cost != null ? naira(m.unit_cost * m.crates) : ""}</td>
                  {member.role === "owner" && <td><form action={deleteMovement}><input type="hidden" name="id" value={m.id} /><SubmitButton className="text-xs text-red-600">Delete</SubmitButton></form></td>}
                </tr>
              ))}</tbody>
            </table></div>
          )}
        </div>
      </div>
    </div>
  );
}
