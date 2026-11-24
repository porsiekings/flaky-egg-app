import { notFound, redirect } from "next/navigation";
import { Flash, PageHeader } from "@/components/ui";
import { SaleForm } from "@/components/SaleForm";
import { requireMember } from "@/lib/auth";
import { todayLagos } from "@/lib/format";
import { addSale } from "../../../sales/actions";

export default async function DeliverOrder({ params, searchParams }: { params: { id: string }; searchParams: { error?: string } }) {
  const { supabase, settings } = await requireMember();
  const [{ data: o }, { data: customers }, { data: stock }] = await Promise.all([
    supabase.from("orders").select("id, crates, unit_price, status, customers(name)").eq("id", params.id).maybeSingle(),
    supabase.from("customers").select("name, phone").order("name"),
    supabase.from("stock_level").select("crates_in_stock").maybeSingle(),
  ]);
  if (!o) notFound();
  if (o.status !== "pending") redirect("/orders?show=done");
  const name = (o.customers as unknown as { name: string } | null)?.name;
  return (
    <div className="mx-auto max-w-lg">
      <PageHeader title="Deliver order" sub="Check the details, then save. This records the sale and takes the crates out of stock." />
      <Flash error={searchParams.error} />
      <div className="card">
        <SaleForm action={addSale} customers={customers ?? []} defaultPrice={Number(settings.default_crate_price)} stock={Number(stock?.crates_in_stock ?? 0)}
          today={todayLagos()} initial={{ customer: name, crates: o.crates, price: Number(o.unit_price), orderId: o.id }} submitLabel="Save as delivered" />
      </div>
    </div>
  );
}
