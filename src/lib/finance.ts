import type { SupabaseClient } from "@supabase/supabase-js";

/** Supabase returns at most 1,000 rows per request; this pages through everything. */
export async function fetchAll<T>(make: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await make(from, from + 999);
    if (error) throw error;
    out.push(...(data ?? []));
    if (!data || data.length < 1000) return out;
  }
}

export type Sale = { sale_date: string; crates: number; amount: number; product_id: string };
export type Payment = { paid_on: string; amount: number };
export type Expense = { spent_on: string; amount: number; category: string };
export type StockIn = { moved_on: string; crates: number; unit_cost: number | null; kind: string; product_id: string };

export async function loadFinance(supabase: SupabaseClient, since: string | null, withExpenses: boolean) {
  const range = <Q extends { gte: (c: string, v: string) => Q }>(q: Q, col: string) => (since ? q.gte(col, since) : q);
  const [sales, payments, expenses, stockIns] = await Promise.all([
    fetchAll<Sale>((a, b) => range(supabase.from("sales").select("sale_date, crates, amount, product_id"), "sale_date").order("sale_date").range(a, b)),
    fetchAll<Payment>((a, b) => range(supabase.from("payments").select("paid_on, amount"), "paid_on").order("paid_on").range(a, b)),
    withExpenses
      ? fetchAll<Expense>((a, b) => range(supabase.from("expenses").select("spent_on, amount, category"), "spent_on").order("spent_on").range(a, b))
      : Promise.resolve([] as Expense[]),
    fetchAll<StockIn>((a, b) => supabase.from("stock_movements").select("moved_on, crates, unit_cost, kind, product_id").in("kind", ["in", "opening"]).range(a, b)),
  ]);
  // Average cost per crate for each egg size, across every delivery that has a cost recorded.
  const acc = new Map<string, { crates: number; cost: number }>();
  for (const s of stockIns) {
    if (s.unit_cost == null) continue;
    const a = acc.get(s.product_id) ?? { crates: 0, cost: 0 };
    a.crates += Number(s.crates); a.cost += Number(s.crates) * Number(s.unit_cost);
    acc.set(s.product_id, a);
  }
  const costBySize = new Map([...acc].map(([k, v]) => [k, v.cost / v.crates]));
  const all = [...acc.values()].reduce((s, v) => ({ crates: s.crates + v.crates, cost: s.cost + v.cost }), { crates: 0, cost: 0 });
  const avgCost = all.crates ? all.cost / all.crates : null;
  return { sales, payments, expenses, avgCost, costBySize };
}

export function summarize(f: Awaited<ReturnType<typeof loadFinance>>, from?: string | null, to?: string | null) {
  const inRange = (d: string) => (!from || d >= from) && (!to || d <= to);
  const sales = f.sales.filter((s) => inRange(s.sale_date));
  const revenue = sales.reduce((s, r) => s + Number(r.amount), 0);
  const crates = sales.reduce((s, r) => s + Number(r.crates), 0);
  const collected = f.payments.filter((p) => inRange(p.paid_on)).reduce((s, r) => s + Number(r.amount), 0);
  const expenses = f.expenses.filter((e) => inRange(e.spent_on)).reduce((s, r) => s + Number(r.amount), 0);
  // Egg cost: each size's crates sold × that size's average cost (or the overall average if a size has none).
  const eggCost = f.avgCost != null ? sales.reduce((s, r) => s + Number(r.crates) * (f.costBySize.get(r.product_id) ?? f.avgCost!), 0) : null;
  const profit = eggCost != null ? revenue - eggCost - expenses : null;
  return { revenue, crates, collected, expenses, eggCost, profit };
}
