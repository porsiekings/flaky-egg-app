import Link from "next/link";
import { notFound } from "next/navigation";
import { Flash, PageHeader, Paid, Stat } from "@/components/ui";
import { PaymentFields } from "@/components/PaymentFields";
import { SubmitButton } from "@/components/SubmitButton";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { requireMember } from "@/lib/auth";
import { count, naira, shortDate, todayLagos } from "@/lib/format";
import { addPayment } from "../../payments/actions";
import { updateCustomer } from "../actions";
import { CustomerFields } from "@/components/CustomerFields";

export default async function CustomerPage({ params, searchParams }: { params: { id: string }; searchParams: { error?: string; ok?: string; edit?: string } }) {
  const { supabase, member, settings } = await requireMember();
  const [{ data: c }, { data: cust }, { data: sales }, { data: pays }] = await Promise.all([
    supabase.from("customer_balances").select("*").eq("id", params.id).maybeSingle(),
    supabase.from("customers").select("name, phone, address, notes").eq("id", params.id).maybeSingle(),
    supabase.from("sale_status").select("id, sale_date, crates, amount, due").eq("customer_id", params.id).order("sale_date", { ascending: false }),
    supabase.from("payments").select("id, paid_on, amount, method").eq("customer_id", params.id).order("paid_on", { ascending: false }),
  ]);
  if (!c || !cust) notFound();
  const bal = Number(c.balance);
  const here = `/customers/${params.id}`;
  const owner = member.role === "owner";

  return (
    <div className="space-y-4">
      <PageHeader title={c.name} sub={[cust.phone, cust.address].filter(Boolean).join(" · ") || undefined}
        action={<div className="flex flex-wrap gap-2">
          <WhatsAppButton phone={cust.phone} name={c.name} balance={bal} business={settings.business_name} />
          <Link href={`/sales/new?customer=${encodeURIComponent(c.name)}`} className="btn-primary">＋ Sale</Link>
          {owner && <Link href={`${here}?edit=1`} className="btn-ghost">Edit</Link>}
        </div>} />
      <Flash error={searchParams.error} ok={searchParams.ok} />

      {owner && searchParams.edit && (
        <form action={updateCustomer} className="card space-y-4">
          <input type="hidden" name="id" value={params.id} />
          <CustomerFields c={cust} />
          <div className="flex gap-2"><SubmitButton className="btn-primary flex-1">Save changes</SubmitButton><Link href={here} className="btn-ghost">Cancel</Link></div>
        </form>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat label="Owes you" value={naira(Math.max(0, bal))} tone={bal > 0 ? "amber" : "brand"} note={bal < 0 ? `In credit by ${naira(-bal)}` : undefined} />
        <Stat label="Bought in total" value={naira(c.total_bought)} note={`${count(c.crates_bought)} crates`} />
        <Stat label="Paid in total" value={naira(c.total_paid)} note={c.last_payment ? `Last paid ${shortDate(c.last_payment)}` : "No payments yet"} />
      </div>

      <details className="card" open={bal > 0}>
        <summary className="cursor-pointer font-medium">Record a payment</summary>
        <form action={addPayment} className="mt-4 space-y-4">
          <input type="hidden" name="customer_id" value={params.id} />
          <input type="hidden" name="from" value={here} />
          <input type="hidden" name="done" value={here} />
          <PaymentFields today={todayLagos()} suggested={bal} />
        </form>
      </details>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card p-0 sm:p-0">
          <div className="px-4 pt-4 font-medium">Sales</div>
          <div className="table-wrap sm:mx-0"><table className="tbl">
            <thead><tr><th>Date</th><th className="num">Crates</th><th className="num">Amount</th><th></th></tr></thead>
            <tbody>{(sales ?? []).map((s) => (
              <tr key={s.id}><td><Link href={`/sales/${s.id}`}>{shortDate(s.sale_date)}</Link></td><td className="num">{count(s.crates)}</td><td className="num">{naira(s.amount)}</td><td><Paid due={Number(s.due)} /></td></tr>
            ))}</tbody>
          </table></div>
          {!sales?.length && <p className="p-4 text-sm text-ink-muted">No sales yet.</p>}
        </div>
        <div className="card p-0 sm:p-0">
          <div className="px-4 pt-4 font-medium">Payments</div>
          <div className="table-wrap sm:mx-0"><table className="tbl">
            <thead><tr><th>Date</th><th>Method</th><th className="num">Amount</th></tr></thead>
            <tbody>{(pays ?? []).map((p) => (
              <tr key={p.id}><td>{shortDate(p.paid_on)}</td><td className="capitalize">{p.method}</td><td className="num">{naira(p.amount)}</td></tr>
            ))}</tbody>
          </table></div>
          {!pays?.length && <p className="p-4 text-sm text-ink-muted">No payments yet.</p>}
        </div>
      </div>
    </div>
  );
}
