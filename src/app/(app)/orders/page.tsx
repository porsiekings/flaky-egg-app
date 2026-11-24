import Link from "next/link";
import { AddButton, Empty, Flash, PageHeader } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";
import { requireMember } from "@/lib/auth";
import { count, naira, shortDate, todayLagos } from "@/lib/format";
import { cancelOrder, deleteOrder } from "./actions";

type O = { id: string; crates: number; unit_price: number; due_date: string | null; status: string; notes: string | null; created_at: string; sale_id: string | null; customers: { name: string } | null };

export default async function OrdersPage({ searchParams }: { searchParams: { show?: string; error?: string; ok?: string } }) {
  const { supabase, member } = await requireMember();
  const show = searchParams.show === "done" ? "done" : "pending";
  let q = supabase.from("orders").select("id, crates, unit_price, due_date, status, notes, created_at, sale_id, customers(name)");
  q = show === "pending" ? q.eq("status", "pending").order("due_date", { ascending: true, nullsFirst: false }) : q.neq("status", "pending").order("created_at", { ascending: false }).limit(200);
  const [{ data }, { data: stock }] = await Promise.all([q, supabase.from("stock_level").select("crates_in_stock").maybeSingle()]);
  const rows = (data ?? []) as unknown as O[];
  const pendingCrates = show === "pending" ? rows.reduce((s, o) => s + o.crates, 0) : 0;
  const inStock = Number(stock?.crates_in_stock ?? 0);
  const today = todayLagos();

  return (
    <div>
      <PageHeader title="Orders" sub={show === "pending" ? `${count(pendingCrates)} crates waiting · ${count(inStock)} in stock` : "Delivered and cancelled"} action={<AddButton href="/orders/new">New order</AddButton>} />
      <Flash error={searchParams.error} ok={searchParams.ok} />
      {show === "pending" && pendingCrates > inStock && <p className="mb-4 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-600">Pending orders need {count(pendingCrates - inStock)} more crates than you have in stock.</p>}
      <div className="mb-4 inline-flex rounded-full bg-ink/5 p-1 text-sm">
        <Link href="/orders" className={`rounded-full px-3 py-1.5 ${show === "pending" ? "bg-white font-semibold shadow-sm" : "text-ink-muted"}`}>Pending</Link>
        <Link href="/orders?show=done" className={`rounded-full px-3 py-1.5 ${show === "done" ? "bg-white font-semibold shadow-sm" : "text-ink-muted"}`}>Done</Link>
      </div>
      {rows.length === 0 ? <Empty title={show === "pending" ? "No pending orders" : "Nothing here yet"} text="When a customer asks for crates to be delivered later, add an order." href="/orders/new" cta="Add order" /> : (
        <div className="grid gap-3 sm:grid-cols-2">
          {rows.map((o) => {
            const late = o.status === "pending" && o.due_date && o.due_date < today;
            return (
              <div key={o.id} className="card">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-medium">{o.customers?.name}</div>
                    <div className="text-sm text-ink-muted">{count(o.crates)} crates × {naira(o.unit_price)} = {naira(o.crates * o.unit_price)}</div>
                    <div className={`mt-1 text-xs ${late ? "text-red-600" : "text-ink-muted"}`}>{o.due_date ? `${late ? "Was due" : "Due"} ${shortDate(o.due_date)}` : `Added ${shortDate(o.created_at.slice(0, 10))}`}</div>
                    {o.notes && <div className="mt-1 text-xs text-ink-muted">{o.notes}</div>}
                  </div>
                  <span className={o.status === "pending" ? "pill-warn" : o.status === "delivered" ? "pill-ok" : "pill-muted"}>{o.status === "pending" ? "Pending" : o.status === "delivered" ? "Delivered" : "Cancelled"}</span>
                </div>
                {o.status === "pending" && (
                  <div className="mt-3 flex gap-2">
                    <Link href={`/orders/${o.id}/deliver`} className="btn-primary flex-1">Mark delivered</Link>
                    <form action={cancelOrder}><input type="hidden" name="id" value={o.id} /><SubmitButton className="btn-ghost">Cancel</SubmitButton></form>
                  </div>
                )}
                {o.status === "delivered" && o.sale_id && <Link href={`/sales/${o.sale_id}`} className="mt-2 inline-block text-sm text-brand-600">View sale ›</Link>}
                {o.status === "cancelled" && member.role === "owner" && (
                  <form action={deleteOrder} className="mt-2"><input type="hidden" name="id" value={o.id} /><SubmitButton className="text-xs text-red-600">Delete</SubmitButton></form>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
