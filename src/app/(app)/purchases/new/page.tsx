import { Flash, PageHeader } from "@/components/ui";
import { PurchaseForm } from "@/components/PurchaseForm";
import { requireMember } from "@/lib/auth";
import { todayLagos } from "@/lib/format";
import { stockByProduct } from "@/lib/inventory";
import { createPurchase } from "../actions";

export default async function NewPurchase({ searchParams }: { searchParams: { error?: string } }) {
  const { supabase } = await requireMember();
  const [products, { data: suppliers }] = await Promise.all([stockByProduct(supabase), supabase.from("suppliers").select("name").order("name")]);
  return (
    <div className="mx-auto max-w-lg">
      <PageHeader title="Receive stock" sub="Eggs bought from a supplier. Record them when they arrive, or as an order you're expecting." />
      <Flash error={searchParams.error} />
      <div className="card">
        <PurchaseForm action={createPurchase} products={products.map((p) => ({ id: p.id, name: p.name, avg_cost: p.avg_cost }))} suppliers={(suppliers ?? []).map((s) => s.name)} today={todayLagos()} />
      </div>
    </div>
  );
}
