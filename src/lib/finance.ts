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

export type Sale = { sale_date: string; crates: number; amount: number };
export type Payment = { paid_on: string; amount: number };
export type Expense = { spent_on: string; amount: number; category: string };
export type StockIn = { moved_on: string; crates: number; unit_cost: number | null; kind: string };

export async function loadFinance(supabase: SupabaseClient, since: string | null, withExpenses: boolean) {
  const range = <Q extends { gte: (c: string, v: string) => Q }>(q: Q, col: string) => (since ? q.gte(col, since) : q);
  const [sales, payments, expenses, stockIns] = await Promise.all([
    fetchAll<Sale>((a, b) => range(supabase.from("sales").select("sale_date, crates, amount"), "sale_date").order("sale_date").range(a, b)),
    fetchAll<Payment>((a, b) => range(supabase.from("payments").select("paid_on, amount"), "paid_on").order("paid_on").range(a, b)),
    withExpenses
      ? fetchAll<Expense>((a, b) => range(supabase.from("expenses").select("spent_on, amount, category"), "spent_on").order("spent_on").range(a, b))
      : Promise.resolve([] as Expense[]),
    fetchAll<StockIn>((a, b) => supabase.from("stock_movements").select("moved_on, crates, unit_cost, kind").eq("kind", "in").range(a, b)),
  ]);
  // Average cost per crate across every delivery that has a cost recorded.
  const costed = stockIns.filter((s) => s.unit_cost != null);
  const costedCrates = costed.reduce((s, r) => s + Number(r.crates), 0);
  const avgCost = costedCrates ? costed.reduce((s, r) => s + Number(r.crates) * Number(r.unit_cost), 0) / costedCrates : null;
  return { sales, payments, expenses, avgCost };
}

export function summarize(f: Awaited<ReturnType<typeof loadFinance>>, from?: string | null, to?: string | null) {
  const inRange = (d: string) => (!from || d >= from) && (!to || d <= to);
  const sales = f.sales.filter((s) => inRange(s.sale_date));
  const revenue = sales.reduce((s, r) => s + Number(r.amount), 0);
  const crates = sales.reduce((s, r) => s + Number(r.crates), 0);
  const collected = f.payments.filter((p) => inRange(p.paid_on)).reduce((s, r) => s + Number(r.amount), 0);
  const expenses = f.expenses.filter((e) => inRange(e.spent_on)).reduce((s, r) => s + Number(r.amount), 0);
  const eggCost = f.avgCost != null ? crates * f.avgCost : null;
  const profit = eggCost != null ? revenue - eggCost - expenses : null;
  return { revenue, crates, collected, expenses, eggCost, profit };
}
