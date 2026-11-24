import Link from "next/link";
import { BarChart } from "@/components/BarChart";
import { PeriodTabs, PERIODS, asPeriod, periodStart } from "@/components/PeriodTabs";
import { Stat } from "@/components/ui";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { requireMember } from "@/lib/auth";
import { loadFinance, summarize } from "@/lib/finance";
import { count, naira, shortDate, todayLagos } from "@/lib/format";

function buckets(period: string, today: string) {
  if (period === "all") {
    const out: { key: string; label: string }[] = [];
    const d = new Date(today.slice(0, 7) + "-15T12:00:00");
    for (let i = 11; i >= 0; i--) {
      const m = new Date(d); m.setMonth(d.getMonth() - i);
      out.push({ key: m.toISOString().slice(0, 7), label: m.toLocaleDateString("en-NG", { month: "short" }) });
    }
    return { monthly: true, out };
  }
  const days = period === "month" ? Number(today.slice(8, 10)) : 7;
  const out: { key: string; label: string }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today + "T12:00:00"); d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    out.push({ key, label: period === "month" ? String(d.getDate()) : d.toLocaleDateString("en-NG", { weekday: "short" }) });
  }
  return { monthly: false, out };
}

export default async function Dashboard({ searchParams }: { searchParams: { period?: string } }) {
  const { supabase, member, settings } = await requireMember();
  const owner = member.role === "owner";
  const period = asPeriod(searchParams.period);
  const today = todayLagos();
  const start = periodStart(period);
  const { monthly, out } = buckets(period, today);
  const chartStart = monthly ? out[0].key + "-01" : out[0].key;
  const loadFrom = [start, chartStart].filter(Boolean).sort()[0] ?? null;

  const [fin, { data: stock }, { data: debtors }, { data: pending }, { data: recent }] = await Promise.all([
    loadFinance(supabase, period === "all" ? null : loadFrom, owner),
    supabase.from("stock_level").select("crates_in_stock").maybeSingle(),
    supabase.from("customer_balances").select("id, name, phone, balance").gt("balance", 0).order("balance", { ascending: false }).limit(6),
    supabase.from("orders").select("crates").eq("status", "pending"),
    supabase.from("sale_status").select("id, customer_name, sale_date, crates, amount, due").order("created_at", { ascending: false }).limit(5),
  ]);
  const s = summarize(fin, start, today);
  const { data: owedAll } = await supabase.from("customer_balances").select("balance").gt("balance", 0);
  const totalOwed = (owedAll ?? []).reduce((a, r) => a + Number(r.balance), 0);
  const inStock = Number(stock?.crates_in_stock ?? 0);
  const low = inStock <= settings.low_stock_level;
  const pendingCrates = (pending ?? []).reduce((a, r) => a + Number(r.crates), 0);

  const keyOf = (d: string) => (monthly ? d.slice(0, 7) : d);
  const salesBy = new Map<string, number>(), paidBy = new Map<string, number>();
  for (const r of fin.sales) salesBy.set(keyOf(r.sale_date), (salesBy.get(keyOf(r.sale_date)) ?? 0) + Number(r.amount));
  for (const r of fin.payments) paidBy.set(keyOf(r.paid_on), (paidBy.get(keyOf(r.paid_on)) ?? 0) + Number(r.amount));
  const bars = out.map((b) => ({
    label: b.label, value: salesBy.get(b.key) ?? 0, sub: paidBy.get(b.key) ?? 0,
    tip: `${monthly ? b.label : shortDate(b.key)}: sold ${naira(salesBy.get(b.key) ?? 0)}, collected ${naira(paidBy.get(b.key) ?? 0)}`,
  }));
  const hour = Number(new Date().toLocaleString("en-NG", { hour: "numeric", hour12: false, timeZone: "Africa/Lagos" }));
  const greet = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-3xl border border-ink-line bg-paper-card p-5 shadow-card sm:p-7">
        <div className="pointer-events-none absolute -left-16 -top-20 h-56 w-56 rounded-full bg-brand-500/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -right-16 h-64 w-64 rounded-full bg-amber-500/25 blur-3xl" />
        <div className="relative">
          <div className="text-[11px] uppercase tracking-[.14em] text-ink-muted">{greet} · {settings.business_name}</div>
          <div className="mt-3 text-sm text-ink-muted">Sales · {PERIODS[period].toLowerCase()}</div>
          <div className="font-serif text-4xl tabular-nums sm:text-6xl">{naira(s.revenue)}</div>
          <p className="mt-2 max-w-xl text-sm text-ink-muted">
            <b className="text-ink">{count(s.crates)} crates</b> sold and <b className="text-ink">{naira(s.collected)}</b> collected. Customers owe you <b className="text-amber-600">{naira(totalOwed)}</b> in total.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/sales/new" className="btn-primary">＋ Sale</Link>
            <Link href="/payments/new" className="btn-ghost">＋ Payment</Link>
            <Link href="/stock" className="btn-ghost">＋ Stock</Link>
            <Link href="/orders/new" className="btn-ghost">＋ Order</Link>
          </div>
        </div>
      </section>

      <PeriodTabs current={period} base="/" />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Collected" value={naira(s.collected)} note={PERIODS[period]} />
        <Stat label="Owed to you" value={naira(totalOwed)} tone="amber" note={`${debtors?.length ?? 0}${(debtors?.length ?? 0) >= 6 ? "+" : ""} customers`} />
        <Stat label="Crates in stock" value={count(inStock)} tone={low ? "red" : "ink"} note={low ? "Low — restock soon" : pendingCrates ? `${count(pendingCrates)} on pending orders` : "No pending orders"} />
        {owner ? (
          <Stat label="Profit" value={s.profit != null ? naira(s.profit) : "—"} tone={s.profit != null && s.profit < 0 ? "red" : "brand"}
            note={s.profit != null ? `After eggs ${naira(s.eggCost)} & expenses ${naira(s.expenses)}` : "Add cost per crate in Stock to see profit"} />
        ) : (
          <Stat label="Crates sold" value={count(s.crates)} note={PERIODS[period]} />
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <div className="card">
          <div className="mb-1 font-medium">{monthly ? "Last 12 months" : period === "month" ? "This month, day by day" : "Last 7 days"}</div>
          <BarChart bars={bars} mainLabel="Sold" subLabel="Collected" />
        </div>
        <div className="card">
          <div className="mb-3 flex items-center justify-between"><span className="font-medium">Who owes the most</span><Link href="/customers?show=owing" className="text-sm text-brand-600">All ›</Link></div>
          {(debtors ?? []).length === 0 ? <p className="text-sm text-ink-muted">Nobody owes you. 🎉</p> : (
            <div className="space-y-3">
              {(debtors ?? []).map((d) => (
                <div key={d.id} className="flex items-center justify-between gap-2">
                  <Link href={`/customers/${d.id}`} className="min-w-0 truncate text-sm">{d.name}</Link>
                  <div className="flex items-center gap-2">
                    <WhatsAppButton small phone={d.phone} name={d.name} balance={Number(d.balance)} business={settings.business_name} />
                    <span className="font-medium tabular-nums text-amber-600">{naira(d.balance)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="card p-0 sm:p-0">
        <div className="flex items-center justify-between px-4 pt-4"><span className="font-medium">Latest sales</span><Link href="/sales" className="text-sm text-brand-600">All ›</Link></div>
        {(recent ?? []).length === 0 ? <p className="p-4 text-sm text-ink-muted">No sales yet. Tap “＋ Sale” to record the first one.</p> : (
          <div className="table-wrap sm:mx-0"><table className="tbl"><tbody>
            {(recent ?? []).map((r) => (
              <tr key={r.id}>
                <td><Link href={`/sales/${r.id}`} className="font-medium">{r.customer_name}</Link><div className="text-xs text-ink-muted">{shortDate(r.sale_date)} · {count(r.crates)} crates</div></td>
                <td className="num">{naira(r.amount)}</td>
                <td className="w-16">{Number(r.due) > 0 ? <span className="pill-warn">Owes</span> : <span className="pill-ok">Paid</span>}</td>
              </tr>
            ))}
          </tbody></table></div>
        )}
      </div>
    </div>
  );
}
