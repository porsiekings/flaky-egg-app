import Link from "next/link";
import { Flash, PageHeader } from "@/components/ui";
import { CustomerFields } from "@/components/CustomerFields";
import { SubmitButton } from "@/components/SubmitButton";
import { requireMember } from "@/lib/auth";
import { count, naira, shortDate } from "@/lib/format";
import { addSupplier } from "./actions";

type S = { id: string; name: string; phone: string | null; purchases: { status: string; received_on: string | null; transport_cost: number; purchase_items: { crates_received: number | null; unit_cost: number }[] }[] };

export default async function SuppliersPage({ searchParams }: { searchParams: { error?: string } }) {
  const { supabase, member } = await requireMember();
  const { data } = await supabase.from("suppliers").select("id, name, phone, purchases(status, received_on, transport_cost, purchase_items(crates_received, unit_cost))").order("name");
  const rows = ((data ?? []) as unknown as S[]).map((s) => {
    const rec = s.purchases.filter((p) => p.status === "received");
    return {
      ...s,
      crates: rec.reduce((a, p) => a + p.purchase_items.reduce((b, i) => b + (i.crates_received ?? 0), 0), 0),
      spent: rec.reduce((a, p) => a + Number(p.transport_cost) + p.purchase_items.reduce((b, i) => b + (i.crates_received ?? 0) * Number(i.unit_cost), 0), 0),
      last: rec.map((p) => p.received_on).filter(Boolean).sort().pop() ?? null,
    };
  });
  return (
    <div className="space-y-4">
      <PageHeader title="Suppliers" sub="Farms and people she buys eggs from" />
      <Flash error={searchParams.error} />
      {rows.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {rows.map((s) => (
            <Link key={s.id} href={`/suppliers/${s.id}`} className="card block transition hover:-translate-y-0.5">
              <div className="flex justify-between gap-2"><span className="font-medium">{s.name}</span>{member.role === "owner" && <span className="tabular-nums text-ink-muted">{naira(s.spent)}</span>}</div>
              <div className="text-sm text-ink-muted">{count(s.crates)} crates bought{s.last ? ` · last ${shortDate(s.last)}` : ""}</div>
              {s.phone && <div className="text-xs text-ink-muted">{s.phone}</div>}
            </Link>
          ))}
        </div>
      )}
      <details className="card" open={rows.length === 0}>
        <summary className="cursor-pointer font-medium">Add a supplier</summary>
        <form action={addSupplier} className="mt-4 space-y-4">
          <CustomerFields />
          <SubmitButton>Save supplier</SubmitButton>
        </form>
      </details>
      <p className="text-xs text-ink-muted">Suppliers are also added automatically when you type a new name while receiving stock.</p>
    </div>
  );
}
