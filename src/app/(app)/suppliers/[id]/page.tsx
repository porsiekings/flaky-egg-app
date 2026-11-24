import Link from "next/link";
import { notFound } from "next/navigation";
import { Flash, PageHeader, Stat } from "@/components/ui";
import { CustomerFields } from "@/components/CustomerFields";
import { SubmitButton } from "@/components/SubmitButton";
import { requireMember } from "@/lib/auth";
import { count, naira, shortDate } from "@/lib/format";
import { updateSupplier } from "../actions";

type Pu = { id: string; status: string; ordered_on: string; received_on: string | null; transport_cost: number; purchase_items: { crates_ordered: number; crates_received: number | null; unit_cost: number; products: { name: string } | null }[] };

export default async function SupplierPage({ params, searchParams }: { params: { id: string }; searchParams: { edit?: string; error?: string; ok?: string } }) {
  const { supabase, member } = await requireMember();
  const owner = member.role === "owner";
  const [{ data: s }, { data: pus }] = await Promise.all([
    supabase.from("suppliers").select("id, name, phone, address, notes").eq("id", params.id).maybeSingle(),
    supabase.from("purchases").select("id, status, ordered_on, received_on, transport_cost, purchase_items(crates_ordered, crates_received, unit_cost, products(name))").eq("supplier_id", params.id).order("ordered_on", { ascending: false }),
  ]);
  if (!s) notFound();
  const list = (pus ?? []) as unknown as Pu[];
  const rec = list.filter((p) => p.status === "received");
  const crates = rec.reduce((a, p) => a + p.purchase_items.reduce((b, i) => b + (i.crates_received ?? 0), 0), 0);
  const spent = rec.reduce((a, p) => a + Number(p.transport_cost) + p.purchase_items.reduce((b, i) => b + (i.crates_received ?? 0) * Number(i.unit_cost), 0), 0);
  const here = `/suppliers/${s.id}`;

  return (
    <div className="space-y-4">
      <PageHeader title={s.name} sub={[s.phone, s.address].filter(Boolean).join(" · ") || undefined}
        action={<div className="flex gap-2">{s.phone && <a href={`tel:${s.phone}`} className="btn-ghost">Call</a>}<Link href="/purchases/new" className="btn-primary">＋ Receive stock</Link>{owner && <Link href={`${here}?edit=1`} className="btn-ghost">Edit</Link>}</div>} />
      <Flash error={searchParams.error} ok={searchParams.ok} />
      {owner && searchParams.edit && (
        <form action={updateSupplier} className="card space-y-4">
          <input type="hidden" name="id" value={s.id} />
          <CustomerFields c={s} />
          <div className="flex gap-2"><SubmitButton className="btn-primary flex-1">Save changes</SubmitButton><Link href={here} className="btn-ghost">Cancel</Link></div>
        </form>
      )}
      <div className="grid grid-cols-2 gap-3">
        <Stat label="Crates bought" value={count(crates)} tone="ink" note={`${rec.length} deliveries`} />
        {owner ? <Stat label="Paid in total" value={naira(spent)} note={crates ? `About ${naira(spent / crates)} a crate` : undefined} /> : <Stat label="On the way" value={list.filter((p) => p.status === "expected").length} />}
      </div>
      <div className="card p-0 sm:p-0">
        <div className="px-4 pt-4 font-medium">Deliveries</div>
        {list.length === 0 ? <p className="p-4 text-sm text-ink-muted">No purchases from this supplier yet.</p> : (
          <div className="table-wrap sm:mx-0"><table className="tbl">
            <thead><tr><th>Date</th><th>Eggs</th><th>Status</th>{owner && <th className="num">Cost</th>}</tr></thead>
            <tbody>{list.map((p) => {
              const q = (i: Pu["purchase_items"][number]) => (p.status === "received" ? i.crates_received ?? 0 : i.crates_ordered);
              return (
                <tr key={p.id}>
                  <td><Link href={`/purchases/${p.id}`}>{shortDate(p.received_on ?? p.ordered_on)}</Link></td>
                  <td>{p.purchase_items.map((i) => `${i.products?.name} ${q(i)}`).join(", ")}</td>
                  <td><span className={p.status === "received" ? "pill-ok" : p.status === "expected" ? "pill-warn" : "pill-muted"}>{p.status === "received" ? "Received" : p.status === "expected" ? "Coming" : "Cancelled"}</span></td>
                  {owner && <td className="num">{naira(Number(p.transport_cost) + p.purchase_items.reduce((a, i) => a + q(i) * Number(i.unit_cost), 0))}</td>}
                </tr>
              );
            })}</tbody>
          </table></div>
        )}
      </div>
    </div>
  );
}
