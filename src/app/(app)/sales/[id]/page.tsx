import Link from "next/link";
import { notFound } from "next/navigation";
import { Flash, PageHeader, Paid } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";
import { requireMember } from "@/lib/auth";
import { count, naira, shortDate } from "@/lib/format";
import { deleteSale } from "../actions";

export default async function SaleDetail({ params, searchParams }: { params: { id: string }; searchParams: { error?: string } }) {
  const { supabase, member } = await requireMember();
  const [{ data: s }, { data: pays }] = await Promise.all([
    supabase.from("sale_status").select("*").eq("id", params.id).maybeSingle(),
    supabase.from("payments").select("id, paid_on, amount, method").eq("sale_id", params.id).order("paid_on"),
  ]);
  if (!s) notFound();
  return (
    <div className="mx-auto max-w-lg space-y-4">
      <PageHeader title={naira(s.amount)} sub={`${count(s.crates)} crates × ${naira(s.unit_price)} · ${shortDate(s.sale_date)}`} />
      <Flash error={searchParams.error} />
      <div className="card space-y-2 text-sm">
        <Row k="Customer" v={<Link className="font-medium text-brand-600" href={`/customers/${s.customer_id}`}>{s.customer_name}</Link>} />
        <Row k="Paid so far" v={naira(s.paid)} />
        <Row k="Left on this sale" v={<span className="flex items-center gap-2">{naira(Math.max(0, s.due))} <Paid due={Number(s.due)} /></span>} />
        {s.notes && <Row k="Note" v={s.notes} />}
      </div>
      {pays && pays.length > 0 && (
        <div className="card text-sm">
          <div className="mb-2 font-medium">Payments for this sale</div>
          {pays.map((p) => <Row key={p.id} k={`${shortDate(p.paid_on)} · ${p.method}`} v={naira(p.amount)} />)}
        </div>
      )}
      <p className="text-xs text-ink-muted">A customer&apos;s payments clear their oldest sales first.</p>
      {member.role === "owner" && (
        <form action={deleteSale}>
          <input type="hidden" name="id" value={s.id} />
          <SubmitButton className="btn-danger w-full">Delete this sale</SubmitButton>
        </form>
      )}
    </div>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return <div className="flex items-center justify-between gap-4 py-1"><span className="text-ink-muted">{k}</span><span className="text-right tabular-nums">{v}</span></div>;
}
