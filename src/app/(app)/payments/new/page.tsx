import { Flash, PageHeader } from "@/components/ui";
import { PaymentFields } from "@/components/PaymentFields";
import { requireMember } from "@/lib/auth";
import { naira, todayLagos } from "@/lib/format";
import { addPayment } from "../actions";

export default async function NewPayment({ searchParams }: { searchParams: { error?: string } }) {
  const { supabase } = await requireMember();
  const { data } = await supabase.from("customer_balances").select("id, name, balance").order("balance", { ascending: false });
  return (
    <div className="mx-auto max-w-lg">
      <PageHeader title="Record payment" sub="Money a customer brought in. It clears their oldest unpaid sales first." />
      <Flash error={searchParams.error} />
      <form action={addPayment} className="card space-y-4">
        <div>
          <label className="label" htmlFor="customer_id">Customer</label>
          <select className="input" id="customer_id" name="customer_id" required defaultValue="">
            <option value="" disabled>Choose a customer</option>
            {(data ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}{Number(c.balance) > 0 ? ` — owes ${naira(c.balance)}` : ""}</option>)}
          </select>
        </div>
        <PaymentFields today={todayLagos()} />
      </form>
    </div>
  );
}
