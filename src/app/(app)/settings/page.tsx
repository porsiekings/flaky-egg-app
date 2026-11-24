import { Flash, PageHeader } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";
import { requireOwner } from "@/lib/auth";
import { changePassword, saveProduct, saveSettings } from "./actions";

type P = { id: string; name: string; sell_price: number; low_stock_level: number; sort_order: number; active: boolean };

function ProductRow({ p }: { p?: P }) {
  return (
    <form action={saveProduct} className="rounded-2xl border border-ink-line bg-white p-3">
      {p && <input type="hidden" name="id" value={p.id} />}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-[1.3fr_1fr_1fr_.6fr]">
        <div><label className="label">Size name</label><input className="input" name="name" defaultValue={p?.name} placeholder="e.g. Jumbo" required /></div>
        <div><label className="label">Sell price / crate (₦)</label><input className="input" name="sell_price" type="number" inputMode="numeric" step="any" min={0} defaultValue={p?.sell_price ?? 5400} required /></div>
        <div><label className="label">Low stock below</label><input className="input" name="low_stock_level" type="number" inputMode="numeric" min={0} defaultValue={p?.low_stock_level ?? 10} required /></div>
        <div><label className="label">Order</label><input className="input" name="sort_order" type="number" inputMode="numeric" defaultValue={p?.sort_order ?? 9} /></div>
      </div>
      <div className="mt-2 flex items-center justify-between gap-2">
        {p ? (
          <select name="active" defaultValue={p.active ? "yes" : "no"} className="rounded-lg border border-ink-line bg-white px-2 py-1 text-sm">
            <option value="yes">In use</option><option value="no">Hidden (no longer sold)</option>
          </select>
        ) : <span />}
        <SubmitButton className="btn-ghost">{p ? "Save" : "＋ Add size"}</SubmitButton>
      </div>
    </form>
  );
}

export default async function SettingsPage({ searchParams }: { searchParams: { error?: string; ok?: string } }) {
  const { settings, supabase, user } = await requireOwner();
  const [{ data: team }, { data: products }] = await Promise.all([
    supabase.from("members").select("user_id, full_name, role"),
    supabase.from("products").select("id, name, sell_price, low_stock_level, sort_order, active").order("sort_order").order("name"),
  ]);
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <PageHeader title="Settings" />
      <Flash error={searchParams.error} ok={searchParams.ok} />

      <div className="card space-y-3">
        <div className="font-medium">Egg sizes and prices</div>
        <p className="text-xs text-ink-muted">The sell price fills in automatically on sales and orders. It can still be changed on each sale.</p>
        {((products ?? []) as P[]).map((p) => <ProductRow key={p.id} p={p} />)}
        <ProductRow />
      </div>

      <form action={saveSettings} className="card space-y-4">
        <div className="font-medium">Business</div>
        <div><label className="label" htmlFor="business_name">Business name</label><input className="input" id="business_name" name="business_name" defaultValue={settings.business_name} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="label" htmlFor="aging_days">Mark eggs “sell first” after (days)</label><input className="input" id="aging_days" name="aging_days" type="number" inputMode="numeric" min={1} defaultValue={settings.aging_days} /></div>
          <div><label className="label" htmlFor="old_days">Mark eggs “old” after (days)</label><input className="input" id="old_days" name="old_days" type="number" inputMode="numeric" min={2} defaultValue={settings.old_days} /></div>
        </div>
        <SubmitButton>Save settings</SubmitButton>
      </form>

      <div className="card space-y-2">
        <div className="font-medium">Team</div>
        {(team ?? []).map((m) => (
          <div key={m.user_id} className="flex items-center justify-between text-sm">
            <span>{m.full_name ?? "—"}{m.user_id === user.id && " (you)"}</span><span className="pill-muted capitalize">{m.role}</span>
          </div>
        ))}
        <p className="text-xs text-ink-muted">Staff accounts can be added later. Staff can record sales, payments, orders and stock, but can&apos;t see costs, expenses, profit, reports or settings.</p>
      </div>

      <form action={changePassword} className="card space-y-4">
        <div className="font-medium">Change password</div>
        <div><label className="label" htmlFor="password">New password</label><input className="input" id="password" name="password" type="password" minLength={8} autoComplete="new-password" required /></div>
        <SubmitButton className="btn-ghost w-full">Change password</SubmitButton>
      </form>
    </div>
  );
}
