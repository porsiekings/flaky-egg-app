import { BarChart } from "@/components/BarChart";
import { PageHeader, Stat } from "@/components/ui";
import { requireOwner } from "@/lib/auth";
import { loadFinance, summarize } from "@/lib/finance";
import { count, naira, todayLagos } from "@/lib/format";
import { stockByProduct } from "@/lib/inventory";

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
  const [fin, products] = await Promise.all([loadFinance(supabase, months[months.length - 1].from, true), stockByProduct(supabase, true)]);
  const bySize = products.map((p) => {
    const ss = fin.sales.filter((s) => s.product_id === p.id);
    const crates = ss.reduce((a, s) => a + Number(s.crates), 0), revenue = ss.reduce((a, s) => a + Number(s.amount), 0);
    const cost = fin.costBySize.get(p.id) ?? fin.avgCost;
    return { name: p.name, crates, revenue, avgPrice: crates ? revenue / crates : null, cost, margin: cost != null ? revenue - crates * cost : null };
  }).filter((r) => r.crates > 0);
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
        <Stat label="Profit" value={all.profit != null ? naira(all.profit) : "—"} tone={all.profit != null && all.profit < 0 ? "red" : "brand"} note={fin.avgCost != null ? `Eggs cost about ${naira(fin.avgCost)} a crate` : "Record cost per crate when receiving stock"} />
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
      {bySize.length > 0 && (
        <div className="card p-0 sm:p-0">
          <div className="px-4 pt-4 font-medium">By egg size (last 12 months)</div>
          <div className="table-wrap sm:mx-0"><table className="tbl">
            <thead><tr><th>Size</th><th className="num">Crates sold</th><th className="num">Sales</th><th className="num">Avg price</th><th className="num">Avg cost</th><th className="num">Profit on eggs</th></tr></thead>
            <tbody>{bySize.map((r) => (
              <tr key={r.name}><td>{r.name}</td><td className="num">{count(r.crates)}</td><td className="num">{naira(r.revenue)}</td><td className="num">{r.avgPrice != null ? naira(r.avgPrice) : "—"}</td><td className="num">{r.cost != null ? naira(r.cost) : "—"}</td><td className="num font-medium text-brand-600">{r.margin != null ? naira(r.margin) : "—"}</td></tr>
            ))}</tbody>
          </table></div>
        </div>
      )}
      <p className="text-xs text-ink-muted">Profit = sales − egg cost − expenses. Egg cost = crates sold × the average cost per crate for that size, including transport, from what you paid when stock arrived. Money spent on eggs is not an expense, so it isn’t counted twice.</p>
      <div className="card">
        <div className="mb-3 font-medium">Download for Excel</div>
        <div className="flex flex-wrap gap-2">
          {[["sales", "Sales"], ["purchases", "Purchases"], ["stock", "Stock history"], ["payments", "Payments"], ["customers", "Customers & balances"], ["expenses", "Expenses"], ["orders", "Orders"]].map(([k, l]) => (
            <a key={k} href={`/export?type=${k}`} className="btn-ghost">⬇ {l}</a>
          ))}
        </div>
      </div>
    </div>
  );
}
