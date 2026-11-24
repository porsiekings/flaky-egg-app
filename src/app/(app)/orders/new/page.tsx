import { Flash, PageHeader } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";
import { requireMember } from "@/lib/auth";
import { todayLagos } from "@/lib/format";
import { addOrder } from "../actions";

export default async function NewOrder({ searchParams }: { searchParams: { error?: string } }) {
  const { supabase, settings } = await requireMember();
  const { data: customers } = await supabase.from("customers").select("name").order("name");
  return (
    <div className="mx-auto max-w-lg">
      <PageHeader title="New order" sub="Crates a customer wants delivered later. Nothing leaves stock until you mark it delivered." />
      <Flash error={searchParams.error} />
      <form action={addOrder} className="card space-y-4">
        <div>
          <label className="label" htmlFor="customer">Customer</label>
          <input className="input" id="customer" name="customer" list="customer-list" required autoComplete="off" />
          <datalist id="customer-list">{(customers ?? []).map((c) => <option key={c.name} value={c.name} />)}</datalist>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="label" htmlFor="crates">Crates</label><input className="input" id="crates" name="crates" type="number" inputMode="numeric" min={1} required /></div>
          <div><label className="label" htmlFor="unit_price">Price per crate (₦)</label><input className="input" id="unit_price" name="unit_price" type="number" inputMode="numeric" step="any" defaultValue={settings.default_crate_price} required /></div>
        </div>
        <div><label className="label" htmlFor="due_date">Deliver by (optional)</label><input className="input" id="due_date" name="due_date" type="date" min={todayLagos()} /></div>
        <div><label className="label" htmlFor="notes">Note</label><input className="input" id="notes" name="notes" /></div>
        <SubmitButton>Save order</SubmitButton>
      </form>
    </div>
  );
}
