"use client";
import { useState } from "react";
import { SubmitButton } from "./SubmitButton";
import { naira } from "@/lib/format";

type Line = { key: number; product_id: string; crates: string; unit_cost: string };

export function PurchaseForm({ action, products, suppliers, today }: {
  action: (f: FormData) => void; products: { id: string; name: string; avg_cost: number | null }[]; suppliers: string[]; today: string;
}) {
  const [arrived, setArrived] = useState(true);
  const [lines, setLines] = useState<Line[]>([{ key: 1, product_id: "", crates: "", unit_cost: "" }]);
  const [transport, setTransport] = useState("");
  const set = (k: number, patch: Partial<Line>) => setLines((ls) => ls.map((l) => (l.key === k ? { ...l, ...patch } : l)));
  const used = new Set(lines.map((l) => l.product_id));
  const eggs = lines.reduce((s, l) => s + (Number(l.crates) || 0) * (Number(l.unit_cost) || 0), 0);
  const crates = lines.reduce((s, l) => s + (Number(l.crates) || 0), 0);
  const total = eggs + (Number(transport) || 0);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="arrived" value={arrived ? "yes" : "no"} />
      <div className="grid grid-cols-2 gap-1 rounded-xl bg-paper p-1 text-sm">
        <button type="button" onClick={() => setArrived(true)} className={`rounded-lg py-2 ${arrived ? "bg-gradient-to-b from-[#36b07c] to-brand-600 font-semibold text-white shadow-[0_6px_14px_-6px_rgba(37,130,90,.7)]" : "text-ink-muted"}`}>It has arrived</button>
        <button type="button" onClick={() => setArrived(false)} className={`rounded-lg py-2 ${!arrived ? "bg-gradient-to-b from-[#36b07c] to-brand-600 font-semibold text-white shadow-[0_6px_14px_-6px_rgba(37,130,90,.7)]" : "text-ink-muted"}`}>Ordered, coming later</button>
      </div>
      <div>
        <label className="label" htmlFor="supplier">Supplier / farm</label>
        <input className="input" id="supplier" name="supplier" list="supplier-list" autoComplete="off" placeholder="New names are added automatically" />
        <datalist id="supplier-list">{suppliers.map((s) => <option key={s} value={s} />)}</datalist>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="label" htmlFor="ordered_on">{arrived ? "Date received" : "Date ordered"}</label><input className="input" id="ordered_on" name="ordered_on" type="date" defaultValue={today} max={today} required /></div>
        {!arrived && <div><label className="label" htmlFor="expected_on">Expected on</label><input className="input" id="expected_on" name="expected_on" type="date" min={today} /></div>}
      </div>

      <div className="space-y-3">
        <div className="text-sm font-medium">Eggs</div>
        {lines.map((l) => (
          <div key={l.key} className="tile rounded-2xl p-3">
            <div className="grid grid-cols-[1.2fr_1fr_1fr] gap-2">
              <div>
                <label className="label">Size</label>
                <select className="input px-2" name="product_id" required value={l.product_id}
                  onChange={(e) => { const p = products.find((x) => x.id === e.target.value); set(l.key, { product_id: e.target.value, unit_cost: l.unit_cost || (p?.avg_cost ? String(Math.round(p.avg_cost)) : "") }); }}>
                  <option value="" disabled>Size</option>
                  {products.map((p) => <option key={p.id} value={p.id} disabled={used.has(p.id) && p.id !== l.product_id}>{p.name}</option>)}
                </select>
              </div>
              <div><label className="label">Crates</label><input className="input px-2" name="crates" type="number" inputMode="numeric" min={1} step={1} required value={l.crates} onChange={(e) => set(l.key, { crates: e.target.value })} /></div>
              <div><label className="label">₦ per crate</label><input className="input px-2" name="unit_cost" type="number" inputMode="numeric" min={0} step="any" required value={l.unit_cost} onChange={(e) => set(l.key, { unit_cost: e.target.value })} /></div>
            </div>
            {lines.length > 1 && <button type="button" className="mt-2 text-xs text-red-600" onClick={() => setLines((ls) => ls.filter((x) => x.key !== l.key))}>Remove</button>}
          </div>
        ))}
        {lines.length < products.length && (
          <button type="button" className="btn-ghost w-full" onClick={() => setLines((ls) => [...ls, { key: Date.now(), product_id: "", crates: "", unit_cost: "" }])}>＋ Add another size</button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div><label className="label" htmlFor="transport_cost">Transport / loading (₦)</label><input className="input" id="transport_cost" name="transport_cost" type="number" inputMode="numeric" min={0} step="any" value={transport} onChange={(e) => setTransport(e.target.value)} /></div>
        <div><label className="label" htmlFor="notes">Note</label><input className="input" id="notes" name="notes" /></div>
      </div>

      <div className="rounded-2xl bg-paper p-4 text-sm">
        <div className="flex justify-between"><span className="text-ink-muted">{crates} crates of eggs</span><span className="tabular-nums">{naira(eggs)}</span></div>
        {Number(transport) > 0 && <div className="flex justify-between"><span className="text-ink-muted">Transport</span><span className="tabular-nums">{naira(Number(transport))}</span></div>}
        <div className="mt-1 flex items-baseline justify-between border-t border-ink-line pt-2"><span>Total paid</span><span className="font-serif text-2xl tabular-nums">{naira(total)}</span></div>
        {crates > 0 && Number(transport) > 0 && <p className="mt-1 text-xs text-ink-muted">Transport adds {naira(Number(transport) / crates)} to each crate&apos;s cost.</p>}
      </div>
      <SubmitButton>{arrived ? "Save and add to stock" : "Save order"}</SubmitButton>
    </form>
  );
}
