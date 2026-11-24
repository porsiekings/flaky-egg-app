import Link from "next/link";
import { AddButton, Empty, Flash, PageHeader } from "@/components/ui";
import { PeriodTabs, asPeriod, periodStart } from "@/components/PeriodTabs";
import { SubmitButton } from "@/components/SubmitButton";
import { requireMember } from "@/lib/auth";
import { naira, shortDate } from "@/lib/format";
import { deletePayment } from "./actions";

export default async function PaymentsPage({ searchParams }: { searchParams: { period?: string; error?: string; ok?: string } }) {
  const { supabase, member } = await requireMember();
  const period = asPeriod(searchParams.period);
  const start = periodStart(period);
  let q = supabase.from("payments").select("id, paid_on, amount, method, notes, customer_id, customers(name)").order("paid_on", { ascending: false }).order("created_at", { ascending: false }).limit(500);
  if (start) q = q.gte("paid_on", start);
  const { data } = await q;
  const rows = (data ?? []) as unknown as { id: string; paid_on: string; amount: number; method: string; notes: string | null; customer_id: string; customers: { name: string } | null }[];
  const total = rows.reduce((s, r) => s + Number(r.amount), 0);
  return (
    <div>
      <PageHeader title="Payments" sub={`${naira(total)} received`} action={<AddButton href="/payments/new">Record payment</AddButton>} />
      <Flash error={searchParams.error} ok={searchParams.ok} />
      <PeriodTabs current={period} base="/payments" />
      {rows.length === 0 ? <Empty title="No payments" text="Money customers pay you shows here, including payments made with a sale." href="/payments/new" cta="Record a payment" /> : (
        <div className="card p-0 sm:p-0"><div className="table-wrap sm:mx-0"><table className="tbl">
          <thead><tr><th>Customer</th><th>Date</th><th>Method</th><th className="num">Amount</th>{member.role === "owner" && <th></th>}</tr></thead>
          <tbody>{rows.map((r) => (
            <tr key={r.id}>
              <td><Link className="font-medium" href={`/customers/${r.customer_id}`}>{r.customers?.name}</Link>{r.notes && <div className="text-xs text-ink-muted">{r.notes}</div>}</td>
              <td className="text-ink-muted">{shortDate(r.paid_on)}</td>
              <td className="capitalize">{r.method}</td>
              <td className="num">{naira(r.amount)}</td>
              {member.role === "owner" && <td><form action={deletePayment}><input type="hidden" name="id" value={r.id} /><SubmitButton className="text-xs text-red-600">Delete</SubmitButton></form></td>}
            </tr>
          ))}</tbody>
        </table></div></div>
      )}
    </div>
  );
}
