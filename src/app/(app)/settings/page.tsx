import { Flash, PageHeader } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";
import { requireOwner } from "@/lib/auth";
import { changePassword, saveSettings } from "./actions";

export default async function SettingsPage({ searchParams }: { searchParams: { error?: string; ok?: string } }) {
  const { settings, supabase, user } = await requireOwner();
  const { data: team } = await supabase.from("members").select("user_id, full_name, role");
  return (
    <div className="mx-auto max-w-lg space-y-4">
      <PageHeader title="Settings" />
      <Flash error={searchParams.error} ok={searchParams.ok} />
      <form action={saveSettings} className="card space-y-4">
        <div className="font-medium">Business</div>
        <div><label className="label" htmlFor="business_name">Business name</label><input className="input" id="business_name" name="business_name" defaultValue={settings.business_name} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="label" htmlFor="default_crate_price">Default price per crate (₦)</label><input className="input" id="default_crate_price" name="default_crate_price" type="number" inputMode="numeric" step="any" defaultValue={settings.default_crate_price} /></div>
          <div><label className="label" htmlFor="low_stock_level">Warn when stock is below</label><input className="input" id="low_stock_level" name="low_stock_level" type="number" inputMode="numeric" defaultValue={settings.low_stock_level} /></div>
        </div>
        <div>
          <label className="label" htmlFor="opening_stock">Opening stock (crates you had when you started using the app)</label>
          <input className="input" id="opening_stock" name="opening_stock" type="number" inputMode="numeric" defaultValue={settings.opening_stock} />
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
        <p className="text-xs text-ink-muted">Staff accounts can be added later. Staff can record sales, payments, orders and stock, but can&apos;t see expenses, reports or settings.</p>
      </div>

      <form action={changePassword} className="card space-y-4">
        <div className="font-medium">Change password</div>
        <div><label className="label" htmlFor="password">New password</label><input className="input" id="password" name="password" type="password" minLength={8} autoComplete="new-password" required /></div>
        <SubmitButton className="btn-ghost w-full">Change password</SubmitButton>
      </form>
    </div>
  );
}
