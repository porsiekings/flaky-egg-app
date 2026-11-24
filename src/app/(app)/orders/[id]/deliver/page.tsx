import { notFound, redirect } from "next/navigation";
import { Flash, PageHeader } from "@/components/ui";
import { SaleForm } from "@/components/SaleForm";
import { requireMember } from "@/lib/auth";
import { todayLagos } from "@/lib/format";
import { stockByProduct } from "@/lib/inventory";
import { addSale } from "../../../sales/actions";

export default async function DeliverOrder({ params, searchParams }: { params: { id: string }; searchParams: { error?: string } }) {
  const { supabase } = await requireMember();
  const [{ data: o }, { data: customers }, products] = await Promise.all([
    supabase.from("orders").select("id, crates, unit_price, status, product_id, customers(name)").eq("id", params.id).maybeSingle(),
    supabase.from("customers").select("name, phone").order("name"),
    stockByProduct(supabase),
  ]);
  if (!o) notFound();
  if (o.status !== "pending") redirect("/orders?show=done");
  const name = (o.customers as unknown as { name: string } | null)?.name;
  return (
    <div className="mx-auto max-w-lg">
      <PageHeader title="Deliver order" sub="Check the details, then save. This records the sale and takes the crates out of stock." />
      <Flash error={searchParams.error} />
      <div className="card">
        <SaleForm action={addSale} customers={customers ?? []} products={products}
          today={todayLagos()} initial={{ customer: name, crates: o.crates, price: Number(o.unit_price), orderId: o.id, productId: o.product_id }} submitLabel="Save as delivered" />
      </div>
    </div>
  );
}
