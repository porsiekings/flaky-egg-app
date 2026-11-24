import Link from "next/link";
import { AddButton, Empty, Flash, PageHeader } from "@/components/ui";
import { requireMember } from "@/lib/auth";
import { count, naira, shortDate, todayLagos } from "@/lib/format";

type Pu = { id: string; ordered_on: string; expected_on: string | null; received_on: string | null; status: string; transport_cost: number;
  suppliers: { name: string } | null; purchase_items: { crates_ordered: number; crates_received: number | null; unit_cost: number; products: { name: string } | null }[] };

export default async function PurchasesPage({ searchParams }: { searchParams: { show?: string; error?: string; ok?: string } }) {
  const { supabase, member } = await requireMember();
  const show = searchParams.show === "expected" ? "expected" : "received";
  let q = supabase.from("purchases").select("id, ordered_on, expected_on, received_on, status, transport_cost, suppliers(name), purchase_items(crates_ordered, crates_received, unit_cost, products(name))");
  q = show === "expected" ? q.eq("status", "expected").order("expected_on", { ascending: true, nullsFirst: false }) : q.neq("status", "expected").order("ordered_on", { ascending: false }).limit(200);
  const [{ data }, { count: expectedCount }] = await Promise.all([q, supabase.from("purchases").select("id", { count: "exact", head: true }).eq("status", "expected")]);
  const rows = (data ?? []) as unknown as Pu[];
  const today = todayLagos();
  const owner = member.role === "owner";
  const monthStart = today.slice(0, 8) + "01";
  const monthSpend = rows.filter((r) => r.status === "received" && (r.received_on ?? r.ordered_on) >= monthStart)
    .reduce((s, r) => s + Number(r.transport_cost) + r.purchase_items.reduce((a, i) => a + (i.crates_received ?? 0) * Number(i.unit_cost), 0), 0);

  return (
    <div>
      <PageHeader title="Purchases" sub={show === "received" && owner ? `${naira(monthSpend)} spent on eggs this month` : "Stock bought from suppliers"} action={<AddButton href="/purchases/new">Receive stock</AddButton>} />
      <Flash error={searchParams.error} ok={searchParams.ok} />
      <div className="mb-4 inline-flex rounded-full bg-ink/5 p-1 text-sm">
        <Link href="/purchases" className={`rounded-full px-3 py-1.5 ${show === "received" ? "bg-white font-semibold shadow-sm" : "text-ink-muted"}`}>Received</Link>
        <Link href="/purchases?show=expected" className={`rounded-full px-3 py-1.5 ${show === "expected" ? "bg-white font-semibold shadow-sm" : "text-ink-muted"}`}>Coming in{expectedCount ? ` (${expectedCount})` : ""}</Link>
      </div>
      {rows.length === 0 ? (
        <Empty title={show === "expected" ? "Nothing on the way" : "No stock received yet"} text={show === "expected" ? "Orders placed with suppliers show here until they arrive." : "Each time eggs arrive from a supplier, record them here."} href="/purchases/new" cta="Receive stock" />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {rows.map((r) => {
            const crates = r.purchase_items.reduce((s, i) => s + (r.status === "received" ? i.crates_received ?? 0 : i.crates_ordered), 0);
            const cost = Number(r.transport_cost) + r.purchase_items.reduce((s, i) => s + (r.status === "received" ? i.crates_received ?? 0 : i.crates_ordered) * Number(i.unit_cost), 0);
            const late = r.status === "expected" && r.expected_on && r.expected_on < today;
            return (
              <Link key={r.id} href={`/purchases/${r.id}`} className="card block transition hover:-translate-y-0.5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-medium">{r.suppliers?.name ?? "Supplier not named"}</div>
                    <div className="text-sm text-ink-muted">{r.purchase_items.map((i) => `${i.products?.name} ${r.status === "received" ? i.crates_received ?? 0 : i.crates_ordered}`).join(" · ")}</div>
                  </div>
                  <span className={r.status === "received" ? "pill-ok" : r.status === "expected" ? "pill-warn" : "pill-muted"}>{r.status === "received" ? "Received" : r.status === "expected" ? "Coming" : "Cancelled"}</span>
                </div>
                <div className="mt-2 flex justify-between text-sm">
                  <span className={late ? "text-red-600" : "text-ink-muted"}>{r.status === "expected" ? (r.expected_on ? `${late ? "Was due" : "Due"} ${shortDate(r.expected_on)}` : `Ordered ${shortDate(r.ordered_on)}`) : shortDate(r.received_on ?? r.ordered_on)}</span>
                  <span className="tabular-nums">{count(crates)} crates{owner ? ` · ${naira(cost)}` : ""}</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
