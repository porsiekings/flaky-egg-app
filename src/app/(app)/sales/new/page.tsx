import { SaleForm } from "@/components/SaleForm";
import { Flash, PageHeader } from "@/components/ui";
import { requireMember } from "@/lib/auth";
import { todayLagos } from "@/lib/format";
import { stockByProduct } from "@/lib/inventory";
import { addSale } from "../actions";

export default async function NewSale({ searchParams }: { searchParams: { error?: string; customer?: string } }) {
  const { supabase } = await requireMember();
  const [{ data: customers }, products] = await Promise.all([
    supabase.from("customers").select("name, phone").order("name"),
    stockByProduct(supabase),
  ]);
  return (
    <div className="mx-auto max-w-lg">
      <PageHeader title="New sale" sub={`${products.reduce((s, p) => s + p.on_hand, 0)} crates in stock`} />
      <Flash error={searchParams.error} />
      <div className="card">
        <SaleForm action={addSale} customers={customers ?? []} products={products} today={todayLagos()} initial={{ customer: searchParams.customer }} />
      </div>
    </div>
  );
}
