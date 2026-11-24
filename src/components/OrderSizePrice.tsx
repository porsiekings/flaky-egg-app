"use client";
import { useState } from "react";

export function OrderSizePrice({ products }: { products: { id: string; name: string; sell_price: number }[] }) {
  const [id, setId] = useState("");
  const [price, setPrice] = useState("");
  return (
    <div className="grid grid-cols-2 gap-3">
      <div>
        <label className="label" htmlFor="product_id">Egg size</label>
        <select className="input" id="product_id" name="product_id" required value={id}
          onChange={(e) => { setId(e.target.value); const p = products.find((x) => x.id === e.target.value); if (p) setPrice(String(p.sell_price)); }}>
          <option value="" disabled>Choose size</option>
          {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>
      <div>
        <label className="label" htmlFor="unit_price">Price per crate (₦)</label>
        <input className="input" id="unit_price" name="unit_price" type="number" inputMode="numeric" step="any" min={0} required value={price} onChange={(e) => setPrice(e.target.value)} />
      </div>
    </div>
  );
}
