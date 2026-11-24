import Link from "next/link";
import { notFound } from "next/navigation";
import { Flash, PageHeader } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";
import { requireMember } from "@/lib/auth";
import { count, naira, shortDate, todayLagos } from "@/lib/format";
import { cancelPurchase, deletePurchase, receivePurchase } from "../actions";

type Item = { id: string; crates_ordered: number; crates_received: number | null; unit_cost: number; product_id: string; products: { name: string } | null };

export default async function PurchaseDetail({ params, searchParams }: { params: { id: string }; searchParams: { error?: string; ok?: string } }) {
  const { supabase, member } = await requireMember();
  const { data: pu } = await supabase.from("purchases").select("id, ordered_on, expected_on, received_on, status, transport_cost, notes, supplier_id, suppliers(name, phone)").eq("id", params.id).maybeSingle();
  if (!pu) notFound();
  const { data: itemsRaw } = await supabase.from("purchase_items").select("id, crates_ordered, crates_received, unit_cost, product_id, products(name)").eq("purchase_id", params.id);
  const items = (itemsRaw ?? []) as unknown as Item[];
  const sup = pu.suppliers as unknown as { name: string; phone: string | null } | null;
  const owner = member.role === "owner";
  const qty = (i: Item) => (pu.status === "received" ? i.crates_received ?? 0 : i.crates_ordered);
  const crates = items.reduce((s, i) => s + qty(i), 0);
  const eggs = items.reduce((s, i) => s + qty(i) * Number(i.unit_cost), 0);
  const total = eggs + Number(pu.transport_cost);

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <PageHeader title={sup?.name ?? "Purchase"} sub={pu.status === "received" ? `Received ${shortDate(pu.received_on)}` : pu.status === "expected" ? `Ordered ${shortDate(pu.ordered_on)}${pu.expected_on ? ` · due ${shortDate(pu.expected_on)}` : ""}` : "Cancelled"} />
      <Flash error={searchParams.error} ok={searchParams.ok} />
      <div className="card space-y-2 text-sm">
        {items.map((i) => (
          <div key={i.id} className="flex justify-between">
            <Link href={`/stock/${i.product_id}`} className="font-medium">{i.products?.name}</Link>
            <span className="tabular-nums">{count(qty(i))} crates{owner ? ` × ${naira(i.unit_cost)}` : ""}{pu.status === "received" && i.crates_received !== i.crates_ordered ? ` (ordered ${i.crates_ordered})` : ""}</span>
          </div>
        ))}
        {owner && (
          <div className="border-t border-ink-line pt-2">
            {Number(pu.transport_cost) > 0 && <div className="flex justify-between text-ink-muted"><span>Transport / loading</span><span>{naira(pu.transport_cost)}</span></div>}
            <div className="flex justify-between font-medium"><span>Total ({count(crates)} crates)</span><span className="tabular-nums">{naira(total)}</span></div>
          </div>
        )}
        {pu.notes && <p className="text-ink-muted">{pu.notes}</p>}
        {sup?.phone && <p className="text-ink-muted">Supplier phone: <a className="text-brand-600" href={`tel:${sup.phone}`}>{sup.phone}</a></p>}
      </div>

      {pu.status === "expected" && (
        <form action={receivePurchase} className="card space-y-3">
          <input type="hidden" name="id" value={pu.id} />
          <div className="font-medium">It has arrived</div>
          <p className="text-xs text-ink-muted">Check what actually came. Change a number if fewer crates arrived.</p>
          {items.map((i) => (
            <div key={i.id} className="flex items-center justify-between gap-3">
              <label htmlFor={`r_${i.id}`} className="text-sm">{i.products?.name} <span className="text-ink-muted">(ordered {i.crates_ordered})</span></label>
              <input className="input w-24" id={`r_${i.id}`} name={`received_${i.id}`} type="number" inputMode="numeric" min={0} step={1} defaultValue={i.crates_ordered} />
            </div>
          ))}
          <div><label className="label" htmlFor="received_on">Date received</label><input className="input" id="received_on" name="received_on" type="date" defaultValue={todayLagos()} max={todayLagos()} /></div>
          <SubmitButton>Mark received and add to stock</SubmitButton>
        </form>
      )}
      {pu.status === "expected" && (
        <form action={cancelPurchase}><input type="hidden" name="id" value={pu.id} /><SubmitButton className="btn-ghost w-full">Cancel this order</SubmitButton></form>
      )}
      {owner && pu.status !== "expected" && (
        <form action={deletePurchase}>
          <input type="hidden" name="id" value={pu.id} />
          <SubmitButton className="btn-danger w-full">Delete (also removes these crates from stock)</SubmitButton>
        </form>
      )}
    </div>
  );
}
