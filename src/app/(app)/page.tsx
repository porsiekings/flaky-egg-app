import Link from "next/link";
import { BarChart } from "@/components/BarChart";
import { PeriodTabs, PERIODS, asPeriod, periodStart } from "@/components/PeriodTabs";
import { Stat } from "@/components/ui";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { requireMember } from "@/lib/auth";
import { loadFinance, summarize } from "@/lib/finance";
import { count, naira, shortDate, todayLagos } from "@/lib/format";
import { ageOf, stockByProduct } from "@/lib/inventory";
import { AgeBadge } from "@/components/AgeBadge";

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

  const [fin, products, { data: debtors }, { data: pending }, { data: recent }, { data: incomingPu }] = await Promise.all([
    loadFinance(supabase, period === "all" ? null : loadFrom, owner),
    stockByProduct(supabase),
    supabase.from("customer_balances").select("id, name, phone, balance").gt("balance", 0).order("balance", { ascending: false }).limit(6),
    supabase.from("orders").select("crates").eq("status", "pending"),
    supabase.from("sale_status").select("id, customer_name, product_name, sale_date, crates, amount, due").order("created_at", { ascending: false }).limit(5),
    supabase.from("purchases").select("id, expected_on, suppliers(name), purchase_items(crates_ordered)").eq("status", "expected").order("expected_on", { ascending: true, nullsFirst: false }).limit(4),
  ]);
  const s = summarize(fin, start, today);
  const { data: owedAll } = await supabase.from("customer_balances").select("balance").gt("balance", 0);
  const totalOwed = (owedAll ?? []).reduce((a, r) => a + Number(r.balance), 0);
  const inStock = products.reduce((a, p) => a + p.on_hand, 0);
  const lowSizes = products.filter((p) => p.on_hand <= p.low_stock_level);
  const low = lowSizes.length > 0;
  const stockValue = products.reduce((a, p) => a + p.stock_value, 0);
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
      <section className="hero">
        <div className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full border border-white/10" />
        <div className="pointer-events-none absolute right-3 top-3 h-28 w-28 rounded-full border border-white/10" />
        <div className="relative">
          <div className="text-[11px] uppercase tracking-[.14em] text-white/70">{greet} · {settings.business_name}</div>
          <div className="mt-3 text-sm text-white/75">Sales · {PERIODS[period].toLowerCase()}</div>
          <div className="font-serif text-[44px] leading-tight tabular-nums tracking-tight [text-shadow:0_10px_30px_rgba(0,0,0,.35)] sm:text-6xl">{naira(s.revenue)}</div>
          <p className="mt-2 max-w-xl text-sm text-white/80">
            <b className="text-white">{count(s.crates)} crates</b> sold and <b className="text-white">{naira(s.collected)}</b> collected. Customers owe you <b className="text-[#ffc76b]">{naira(totalOwed)}</b> in total.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/sales/new" className="btn-light">＋ Sale</Link>
            <Link href="/purchases/new" className="btn-glass">＋ Receive stock</Link>
            <Link href="/payments/new" className="btn-glass">＋ Payment</Link>
            <Link href="/orders/new" className="btn-glass">＋ Order</Link>
          </div>
        </div>
      </section>

      <PeriodTabs current={period} base="/" />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Collected" value={naira(s.collected)} note={PERIODS[period]} />
        <Stat label="Owed to you" value={naira(totalOwed)} tone="amber" note={`${debtors?.length ?? 0}${(debtors?.length ?? 0) >= 6 ? "+" : ""} customers`} />
        <Stat label="Crates in stock" value={count(inStock)} tone={low ? "red" : "ink"} note={low ? `Low: ${lowSizes.map((p) => p.name).join(", ")}` : owner ? `Worth ${naira(stockValue)}` : pendingCrates ? `${count(pendingCrates)} on pending orders` : "All sizes OK"} />
        {owner ? (
          <Stat label="Profit" value={s.profit != null ? naira(s.profit) : "—"} tone={s.profit != null && s.profit < 0 ? "red" : "brand"}
            note={s.profit != null ? `After eggs ${naira(s.eggCost)} & expenses ${naira(s.expenses)}` : "Enter cost per crate when receiving stock"} />
        ) : (
          <Stat label="Crates sold" value={count(s.crates)} note={PERIODS[period]} />
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <div className="card">
          <div className="mb-3 flex items-center justify-between"><span className="font-medium">Stock by size</span><Link href="/stock" className="text-sm text-brand-600">Stock ›</Link></div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {products.map((p) => {
              const age = ageOf(p.oldest_batch, p.on_hand, settings.aging_days, settings.old_days);
              const isLow = p.on_hand <= p.low_stock_level;
              return (
                <Link key={p.id} href={`/stock/${p.id}`} className={`tile p-3 transition hover:-translate-y-0.5 ${isLow ? "!border-red-200 !bg-red-50" : ""}`}>
                  <div className="text-xs text-ink-muted">{p.name}</div>
                  <div className={`font-serif text-3xl tabular-nums ${isLow ? "text-red-600" : ""}`}>{count(p.on_hand)}</div>
                  <div className="mt-1 min-h-[22px]"><AgeBadge age={age} /></div>
                </Link>
              );
            })}
          </div>
        </div>
        <div className="card">
          <div className="mb-3 flex items-center justify-between"><span className="font-medium">Coming in</span><Link href="/purchases?show=expected" className="text-sm text-brand-600">All ›</Link></div>
          {(incomingPu ?? []).length === 0 ? <p className="text-sm text-ink-muted">No deliveries expected. <Link href="/purchases/new" className="text-brand-600">Record an order ›</Link></p> : (
            <div className="space-y-2">
              {((incomingPu ?? []) as unknown as { id: string; expected_on: string | null; suppliers: { name: string } | null; purchase_items: { crates_ordered: number }[] }[]).map((pu) => (
                <Link key={pu.id} href={`/purchases/${pu.id}`} className="flex justify-between text-sm">
                  <span>{pu.suppliers?.name ?? "Supplier"}<span className="ml-1 text-xs text-ink-muted">{pu.expected_on ? shortDate(pu.expected_on) : ""}</span></span>
                  <span className="tabular-nums">{count(pu.purchase_items.reduce((a, i) => a + i.crates_ordered, 0))} crates</span>
                </Link>
              ))}
            </div>
          )}
        </div>
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
                <td><Link href={`/sales/${r.id}`} className="font-medium">{r.customer_name}</Link><div className="text-xs text-ink-muted">{shortDate(r.sale_date)} · {count(r.crates)} {r.product_name}</div></td>
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
