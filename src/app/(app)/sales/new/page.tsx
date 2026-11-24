import { SaleForm } from "@/components/SaleForm";
import { Flash, PageHeader } from "@/components/ui";
import { requireMember } from "@/lib/auth";
import { todayLagos } from "@/lib/format";
import { addSale } from "../actions";

export default async function NewSale({ searchParams }: { searchParams: { error?: string; customer?: string } }) {
  const { supabase, settings } = await requireMember();
  const [{ data: customers }, { data: stock }] = await Promise.all([
    supabase.from("customers").select("name, phone").order("name"),
    supabase.from("stock_level").select("crates_in_stock").maybeSingle(),
  ]);
  return (
    <div className="mx-auto max-w-lg">
      <PageHeader title="New sale" sub={`${stock?.crates_in_stock ?? 0} crates in stock`} />
      <Flash error={searchParams.error} />
      <div className="card">
        <SaleForm action={addSale} customers={customers ?? []} defaultPrice={Number(settings.default_crate_price)}
          stock={Number(stock?.crates_in_stock ?? 0)} today={todayLagos()} initial={{ customer: searchParams.customer }} />
      </div>
    </div>
  );
}
