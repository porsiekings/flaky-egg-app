import { BarChart } from "@/components/BarChart";
import { PageHeader, Stat } from "@/components/ui";
import { requireOwner } from "@/lib/auth";
import { loadFinance, summarize } from "@/lib/finance";
import { count, naira, todayLagos } from "@/lib/format";

export default async function ReportsPage() {
  const { supabase } = await requireOwner();
  const today = todayLagos();
  const months: { key: string; label: string; from: string; to: string }[] = [];
  const base = new Date(today.slice(0, 7) + "-15T12:00:00");
  for (let i = 0; i < 12; i++) {
    const m = new Date(base); m.setMonth(base.getMonth() - i);
    const key = m.toISOString().slice(0, 7);
    const last = new Date(m.getFullYear(), m.getMonth() + 1, 0).getDate();
    months.push({ key, label: m.toLocaleDateString("en-NG", { month: "long", year: "numeric" }), from: `${key}-01`, to: `${key}-${String(last).padStart(2, "0")}` });
  }
  const fin = await loadFinance(supabase, months[months.length - 1].from, true);
  const rows = months.map((m) => ({ ...m, ...summarize(fin, m.from, m.to) }));
  const all = summarize(fin, null, today);
  const bars = [...rows].reverse().map((r) => ({ label: r.label.slice(0, 3), value: r.revenue, sub: Math.max(0, r.profit ?? 0), tip: `${r.label}: sales ${naira(r.revenue)}, profit ${r.profit != null ? naira(r.profit) : "—"}` }));

  return (
    <div className="space-y-4">
      <PageHeader title="Reports" sub="The last 12 months" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Sales" value={naira(all.revenue)} note={`${count(all.crates)} crates`} />
        <Stat label="Collected" value={naira(all.collected)} />
        <Stat label="Expenses" value={naira(all.expenses)} tone="amber" />
        <Stat label="Profit" value={all.profit != null ? naira(all.profit) : "—"} tone={all.profit != null && all.profit < 0 ? "red" : "brand"} note={fin.avgCost != null ? `Eggs cost about ${naira(fin.avgCost)} a crate` : "Record cost per crate in Stock"} />
      </div>
      <div className="card"><div className="mb-1 font-medium">Sales and profit by month</div><BarChart bars={bars} mainLabel="Sales" subLabel="Profit" /></div>
      <div className="card p-0 sm:p-0">
        <div className="table-wrap sm:mx-0"><table className="tbl">
          <thead><tr><th>Month</th><th className="num">Crates</th><th className="num">Sales</th><th className="num">Collected</th><th className="num">Egg cost</th><th className="num">Expenses</th><th className="num">Profit</th></tr></thead>
          <tbody>{rows.map((r) => (
            <tr key={r.key}>
              <td>{r.label}</td><td className="num">{count(r.crates)}</td><td className="num">{naira(r.revenue)}</td><td className="num">{naira(r.collected)}</td>
              <td className="num">{r.eggCost != null ? naira(r.eggCost) : "—"}</td><td className="num">{naira(r.expenses)}</td>
              <td className={`num font-medium ${r.profit != null && r.profit < 0 ? "text-red-600" : "text-brand-600"}`}>{r.profit != null ? naira(r.profit) : "—"}</td>
            </tr>
          ))}</tbody>
        </table></div>
      </div>
      <p className="text-xs text-ink-muted">Profit = sales − (crates sold × average cost per crate) − expenses. Average cost comes from the cost per crate you enter when stock arrives.</p>
      <div className="card">
        <div className="mb-3 font-medium">Download for Excel</div>
        <div className="flex flex-wrap gap-2">
          {[["sales", "Sales"], ["payments", "Payments"], ["customers", "Customers & balances"], ["expenses", "Expenses"], ["stock", "Stock history"], ["orders", "Orders"]].map(([k, l]) => (
            <a key={k} href={`/export?type=${k}`} className="btn-ghost">⬇ {l}</a>
          ))}
        </div>
      </div>
    </div>
  );
}
