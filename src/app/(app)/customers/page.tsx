import Link from "next/link";
import { AddButton, Empty, PageHeader } from "@/components/ui";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { requireMember } from "@/lib/auth";
import { count, daysSince, naira } from "@/lib/format";

type C = { id: string; name: string; phone: string | null; total_bought: number; crates_bought: number; balance: number };

export default async function CustomersPage({ searchParams }: { searchParams: { q?: string; show?: string } }) {
  const { supabase, settings } = await requireMember();
  const [{ data }, { data: unpaid }] = await Promise.all([
    supabase.from("customer_balances").select("id, name, phone, total_bought, crates_bought, balance").order("name"),
    supabase.from("sale_status").select("customer_id, sale_date").gt("due", 0),
  ]);
  const oldest = new Map<string, string>();
  for (const u of unpaid ?? []) if (!oldest.has(u.customer_id) || u.sale_date < oldest.get(u.customer_id)!) oldest.set(u.customer_id, u.sale_date);

  const q = (searchParams.q ?? "").toLowerCase();
  const owing = searchParams.show === "owing";
  let rows = ((data ?? []) as C[]).filter((c) => (!q || c.name.toLowerCase().includes(q)) && (!owing || Number(c.balance) > 0));
  if (owing) rows = rows.sort((a, b) => Number(b.balance) - Number(a.balance));
  const totalOwed = ((data ?? []) as C[]).reduce((s, c) => s + Math.max(0, Number(c.balance)), 0);

  return (
    <div>
      <PageHeader title="Customers" sub={`${naira(totalOwed)} owed to you in total`} action={<AddButton href="/customers/new">New customer</AddButton>} />
      <form className="mb-4 flex flex-wrap gap-2">
        <input className="input max-w-xs flex-1" name="q" defaultValue={searchParams.q} placeholder="Search customers…" />
        {owing && <input type="hidden" name="show" value="owing" />}
        <div className="inline-flex rounded-full bg-ink/5 p-1 text-sm">
          <Link href="/customers" className={`rounded-full px-3 py-1.5 ${!owing ? "bg-white font-semibold shadow-sm" : "text-ink-muted"}`}>All</Link>
          <Link href="/customers?show=owing" className={`rounded-full px-3 py-1.5 ${owing ? "bg-white font-semibold shadow-sm" : "text-ink-muted"}`}>Owing</Link>
        </div>
      </form>
      {rows.length === 0 ? (
        <Empty title={q || owing ? "No matches" : "No customers yet"} text={q || owing ? "Try a different search." : "Customers are added automatically when you record a sale, or add one here."} href="/customers/new" cta="Add customer" />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {rows.map((c) => {
            const bal = Number(c.balance);
            const days = daysSince(oldest.get(c.id));
            return (
              <div key={c.id} className="card flex items-center justify-between gap-3">
                <Link href={`/customers/${c.id}`} className="min-w-0 flex-1">
                  <div className="truncate font-medium">{c.name}</div>
                  <div className="text-xs text-ink-muted">{count(c.crates_bought)} crates · {naira(c.total_bought)} bought</div>
                  {bal > 0 && days !== null && <div className={`mt-1 text-xs ${days > 14 ? "text-red-600" : "text-ink-muted"}`}>Owing for {days} day{days === 1 ? "" : "s"}</div>}
                </Link>
                <div className="flex flex-col items-end gap-1">
                  <div className={`font-serif text-lg tabular-nums ${bal > 0 ? "text-amber-600" : "text-brand-600"}`}>{bal > 0 ? naira(bal) : "Paid up"}</div>
                  <WhatsAppButton small phone={c.phone} name={c.name} balance={bal} business={settings.business_name} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
