"use client";
import { useState } from "react";
import { SubmitButton } from "./SubmitButton";
import { naira } from "@/lib/format";

type Props = {
  action: (f: FormData) => void;
  customers: { name: string; phone: string | null }[];
  defaultPrice: number;
  stock: number;
  today: string;
  initial?: { customer?: string; crates?: number; price?: number; orderId?: string };
  submitLabel?: string;
};

export function SaleForm({ action, customers, defaultPrice, stock, today, initial, submitLabel = "Save sale" }: Props) {
  const [crates, setCrates] = useState(String(initial?.crates ?? ""));
  const [price, setPrice] = useState(String(initial?.price ?? defaultPrice));
  const [paid, setPaid] = useState("");
  const [payMode, setPayMode] = useState<"full" | "part" | "none">("full");
  const total = (Number(crates) || 0) * (Number(price) || 0);
  const paidNow = payMode === "full" ? total : payMode === "none" ? 0 : Number(paid) || 0;
  const owes = Math.max(0, total - paidNow);
  const overStock = (Number(crates) || 0) > stock;

  return (
    <form action={action} className="space-y-4">
      {initial?.orderId && <input type="hidden" name="order_id" value={initial.orderId} />}
      <div>
        <label className="label" htmlFor="customer">Customer</label>
        <input className="input" id="customer" name="customer" list="customer-list" defaultValue={initial?.customer} required autoComplete="off" placeholder="Type a name — new names are added automatically" />
        <datalist id="customer-list">{customers.map((c) => <option key={c.name} value={c.name} />)}</datalist>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="crates">Crates</label>
          <input className="input" id="crates" name="crates" type="number" inputMode="numeric" min={1} step={1} required value={crates} onChange={(e) => setCrates(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="unit_price">Price per crate (₦)</label>
          <input className="input" id="unit_price" name="unit_price" type="number" inputMode="numeric" min={0} step="any" required value={price} onChange={(e) => setPrice(e.target.value)} />
        </div>
      </div>
      {overStock && <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-600">Only {stock} crates are in stock. You can still save it if the stock count is behind.</p>}
      <div>
        <label className="label" htmlFor="sale_date">Date</label>
        <input className="input" id="sale_date" name="sale_date" type="date" defaultValue={today} max={today} required />
      </div>

      <div className="rounded-2xl bg-paper p-4">
        <div className="flex items-baseline justify-between">
          <span className="text-sm text-ink-muted">Total</span>
          <span className="font-serif text-2xl tabular-nums">{naira(total)}</span>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-1 rounded-xl bg-white p-1 text-sm">
          {(["full", "part", "none"] as const).map((m) => (
            <button type="button" key={m} onClick={() => setPayMode(m)}
              className={`rounded-lg py-2 ${payMode === m ? "bg-brand-500 font-semibold text-white" : "text-ink-muted"}`}>
              {m === "full" ? "Paid all" : m === "part" ? "Paid some" : "Not paid"}
            </button>
          ))}
        </div>
        {payMode === "part" && (
          <div className="mt-3">
            <label className="label" htmlFor="paid_part">Amount paid now (₦)</label>
            <input className="input" id="paid_part" type="number" inputMode="numeric" min={0} step="any" value={paid} onChange={(e) => setPaid(e.target.value)} required />
          </div>
        )}
        <input type="hidden" name="paid_now" value={paidNow} />
        {paidNow > 0 && (
          <div className="mt-3">
            <label className="label" htmlFor="method">Paid by</label>
            <select className="input" id="method" name="method" defaultValue="cash">
              <option value="cash">Cash</option><option value="transfer">Transfer</option><option value="pos">POS</option><option value="other">Other</option>
            </select>
          </div>
        )}
        {owes > 0 && <p className="mt-3 text-sm">This will add <b className="text-amber-600">{naira(owes)}</b> to what they owe.</p>}
        {paidNow > total && total > 0 && <p className="mt-3 text-sm text-red-700">Amount paid is more than the total.</p>}
      </div>

      <div>
        <label className="label" htmlFor="notes">Note (optional)</label>
        <input className="input" id="notes" name="notes" />
      </div>
      <SubmitButton>{submitLabel}</SubmitButton>
    </form>
  );
}
