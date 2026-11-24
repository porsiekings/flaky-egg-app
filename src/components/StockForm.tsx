"use client";
import { useState } from "react";
import { SubmitButton } from "./SubmitButton";

export function StockForm({ action, today }: { action: (f: FormData) => void; today: string }) {
  const [kind, setKind] = useState<"in" | "spoilt" | "count">("in");
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="kind" value={kind} />
      <div className="grid grid-cols-3 gap-1 rounded-xl bg-paper p-1 text-sm">
        {([["in", "Stock arrived"], ["spoilt", "Cracked / spoilt"], ["count", "Correct count"]] as const).map(([k, l]) => (
          <button key={k} type="button" onClick={() => setKind(k)} className={`rounded-lg py-2 ${kind === k ? "bg-brand-500 font-semibold text-white" : "text-ink-muted"}`}>{l}</button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="crates">{kind === "count" ? "Crates you actually have" : "Crates"}</label>
          <input className="input" id="crates" name="crates" type="number" inputMode="numeric" min={kind === "count" ? 0 : 1} step={1} required />
        </div>
        <div>
          <label className="label" htmlFor="moved_on">Date</label>
          <input className="input" id="moved_on" name="moved_on" type="date" defaultValue={today} max={today} required />
        </div>
      </div>
      {kind === "in" && (
        <div className="grid grid-cols-2 gap-3">
          <div><label className="label" htmlFor="unit_cost">Cost per crate (₦)</label><input className="input" id="unit_cost" name="unit_cost" type="number" inputMode="numeric" step="any" min={0} placeholder="For profit" /></div>
          <div><label className="label" htmlFor="supplier">Supplier / farm</label><input className="input" id="supplier" name="supplier" /></div>
        </div>
      )}
      <div><label className="label" htmlFor="notes">Note</label><input className="input" id="notes" name="notes" placeholder={kind === "spoilt" ? "e.g. broke on delivery" : ""} /></div>
      {kind === "count" && <p className="text-xs text-ink-muted">Use this after counting the crates in the store. The app adds a correction so the stock matches your count.</p>}
      <SubmitButton>Save</SubmitButton>
    </form>
  );
}
