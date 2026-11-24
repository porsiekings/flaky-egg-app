import Link from "next/link";
import { AddButton, Empty, Flash, PageHeader, Paid } from "@/components/ui";
import { PeriodTabs, asPeriod, periodStart } from "@/components/PeriodTabs";
import { requireMember } from "@/lib/auth";
import { count, naira, shortDate } from "@/lib/format";

type Row = { id: string; customer_name: string; product_name: string; sale_date: string; crates: number; amount: number; paid: number; due: number };

export default async function SalesPage({ searchParams }: { searchParams: { period?: string; error?: string; ok?: string; again?: string } }) {
  const { supabase } = await requireMember();
  const period = asPeriod(searchParams.period);
  const start = periodStart(period);
  let q = supabase.from("sale_status").select("id, customer_name, product_name, sale_date, crates, amount, paid, due").order("sale_date", { ascending: false }).order("created_at", { ascending: false }).limit(500);
  if (start) q = q.gte("sale_date", start);
  const { data } = await q;
  const rows = (data ?? []) as Row[];
  const total = rows.reduce((s, r) => s + Number(r.amount), 0);
  const crates = rows.reduce((s, r) => s + Number(r.crates), 0);

  return (
    <div>
      <PageHeader title="Sales" sub={`${count(crates)} crates · ${naira(total)}`} action={<AddButton href="/sales/new">New sale</AddButton>} />
      <Flash error={searchParams.error} ok={searchParams.ok} />
      {searchParams.again && <Link href={`/sales/new?customer=${encodeURIComponent(searchParams.again)}`} className="mb-4 -mt-2 inline-block text-sm text-brand-600">＋ Add another size for {searchParams.again}</Link>}
      <PeriodTabs current={period} base="/sales" />
      {rows.length === 0 ? (
        <Empty title="No sales yet" text="Sales you record will show here." href="/sales/new" cta="Record a sale" />
      ) : (
        <div className="card p-0 sm:p-0">
          <div className="table-wrap sm:mx-0">
            <table className="tbl">
              <thead><tr><th>Customer</th><th>Date</th><th>Size</th><th className="num">Crates</th><th className="num">Amount</th><th>Status</th></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="hover:bg-paper/60">
                    <td><Link href={`/sales/${r.id}`} className="font-medium">{r.customer_name}</Link></td>
                    <td className="text-ink-muted">{shortDate(r.sale_date)}</td>
                    <td>{r.product_name}</td>
                    <td className="num">{count(r.crates)}</td>
                    <td className="num">{naira(r.amount)}</td>
                    <td><Paid due={Number(r.due)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
