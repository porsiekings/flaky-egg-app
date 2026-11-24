import { Flash, PageHeader } from "@/components/ui";
import { PeriodTabs, asPeriod, periodStart } from "@/components/PeriodTabs";
import { SubmitButton } from "@/components/SubmitButton";
import { requireOwner } from "@/lib/auth";
import { EXPENSE_CATEGORIES } from "@/lib/categories";
import { naira, shortDate, todayLagos } from "@/lib/format";
import { addExpense, deleteExpense } from "./actions";

export default async function ExpensesPage({ searchParams }: { searchParams: { period?: string; error?: string; ok?: string } }) {
  const { supabase } = await requireOwner();
  const period = asPeriod(searchParams.period);
  const start = periodStart(period);
  let q = supabase.from("expenses").select("id, spent_on, category, amount, notes").order("spent_on", { ascending: false }).order("created_at", { ascending: false }).limit(500);
  if (start) q = q.gte("spent_on", start);
  const { data } = await q;
  const rows = data ?? [];
  const total = rows.reduce((s, r) => s + Number(r.amount), 0);
  const byCat = new Map<string, number>();
  for (const r of rows) byCat.set(r.category, (byCat.get(r.category) ?? 0) + Number(r.amount));
  const cats = [...byCat.entries()].sort((a, b) => b[1] - a[1]);
  const today = todayLagos();

  return (
    <div className="space-y-4">
      <PageHeader title="Expenses" sub={`${naira(total)} spent`} />
      <Flash error={searchParams.error} ok={searchParams.ok} />
      <PeriodTabs current={period} base="/expenses" />
      <div className="grid gap-4 lg:grid-cols-[1fr_1.3fr]">
        <div className="space-y-4">
          <form action={addExpense} className="card space-y-4">
            <div className="font-medium">Add expense</div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label" htmlFor="amount">Amount (₦)</label><input className="input" id="amount" name="amount" type="number" inputMode="numeric" min={1} step="any" required /></div>
              <div><label className="label" htmlFor="spent_on">Date</label><input className="input" id="spent_on" name="spent_on" type="date" defaultValue={today} max={today} required /></div>
            </div>
            <div><label className="label" htmlFor="category">Category</label>
              <select className="input" id="category" name="category">{EXPENSE_CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></div>
            <div><label className="label" htmlFor="notes">Note</label><input className="input" id="notes" name="notes" placeholder="e.g. fuel for delivery to Ikeja" /></div>
            <SubmitButton>Save expense</SubmitButton>
          </form>
          {cats.length > 0 && (
            <div className="card space-y-3">
              <div className="font-medium">Where the money went</div>
              {cats.map(([c, v]) => (
                <div key={c}>
                  <div className="flex justify-between text-sm"><span>{c}</span><span className="tabular-nums">{naira(v)}</span></div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-paper"><div className="h-full rounded-full bg-gradient-to-r from-amber-500/60 to-amber-500" style={{ width: `${(v / cats[0][1]) * 100}%` }} /></div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="card p-0 sm:p-0">
          <div className="px-4 pt-4 font-medium">History</div>
          {rows.length === 0 ? <p className="p-4 text-sm text-ink-muted">No expenses in this period.</p> : (
            <div className="table-wrap sm:mx-0"><table className="tbl">
              <thead><tr><th>Date</th><th>Category</th><th className="num">Amount</th><th></th></tr></thead>
              <tbody>{rows.map((r) => (
                <tr key={r.id}>
                  <td className="text-ink-muted">{shortDate(r.spent_on)}</td>
                  <td>{r.category}{r.notes && <div className="text-xs text-ink-muted">{r.notes}</div>}</td>
                  <td className="num">{naira(r.amount)}</td>
                  <td><form action={deleteExpense}><input type="hidden" name="id" value={r.id} /><SubmitButton className="text-xs text-red-600">Delete</SubmitButton></form></td>
                </tr>
              ))}</tbody>
            </table></div>
          )}
        </div>
      </div>
    </div>
  );
}
