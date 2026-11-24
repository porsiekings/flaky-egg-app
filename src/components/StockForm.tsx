"use client";
import { useState } from "react";
import { SubmitButton } from "./SubmitButton";

type P = { id: string; name: string; on_hand: number };

export function StockForm({ action, today, products, productId, from }: { action: (f: FormData) => void; today: string; products: P[]; productId?: string; from?: string }) {
  const [kind, setKind] = useState<"spoilt" | "count" | "opening">("spoilt");
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="kind" value={kind} />
      {from && <input type="hidden" name="from" value={from} />}
      <div className="grid grid-cols-3 gap-1 rounded-xl bg-paper p-1 text-sm">
        {([["spoilt", "Cracked / spoilt"], ["count", "Correct count"], ["opening", "Old stock"]] as const).map(([k, l]) => (
          <button key={k} type="button" onClick={() => setKind(k)} className={`rounded-lg py-2 ${kind === k ? "bg-gradient-to-b from-[#36b07c] to-brand-600 font-semibold text-white shadow-[0_6px_14px_-6px_rgba(37,130,90,.7)]" : "text-ink-muted"}`}>{l}</button>
        ))}
      </div>
      {productId ? <input type="hidden" name="product_id" value={productId} /> : (
        <div>
          <label className="label" htmlFor="product_id">Egg size</label>
          <select className="input" id="product_id" name="product_id" required defaultValue="">
            <option value="" disabled>Choose size</option>
            {products.map((p) => <option key={p.id} value={p.id}>{p.name} — {p.on_hand} in stock</option>)}
          </select>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="crates">{kind === "count" ? "Crates you actually have" : "Crates"}</label>
          <input className="input" id="crates" name="crates" type="number" inputMode="numeric" min={kind === "count" ? 0 : 1} step={1} required />
        </div>
        <div>
          <label className="label" htmlFor="moved_on">{kind === "opening" ? "Date she bought it" : "Date"}</label>
          <input className="input" id="moved_on" name="moved_on" type="date" defaultValue={today} max={today} required />
        </div>
      </div>
      {kind === "opening" && (
        <div><label className="label" htmlFor="unit_cost">What she paid per crate (₦)</label><input className="input" id="unit_cost" name="unit_cost" type="number" inputMode="numeric" step="any" min={0} required /></div>
      )}
      <div><label className="label" htmlFor="notes">Note</label><input className="input" id="notes" name="notes" placeholder={kind === "spoilt" ? "e.g. broke on delivery" : ""} /></div>
      <p className="text-xs text-ink-muted">
        {kind === "count" && "After counting the store, enter the real number. The app adds a correction so the stock matches."}
        {kind === "opening" && "Stock she already had before using the app. The date tells the app how old the eggs are."}
        {kind === "spoilt" && "Crates that cracked or went bad. They come out of stock but aren't counted as sales."}
      </p>
      <SubmitButton>Save</SubmitButton>
    </form>
  );
}
