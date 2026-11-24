"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireMember, requireOwner } from "@/lib/auth";
import { supplierIdFor } from "@/lib/customers";
import { back, num, str } from "@/lib/forms";
import { todayLagos } from "@/lib/format";

type Item = { id: string; product_id: string; crates: number; unit_cost: number };

/** Put received crates into stock as batches. Transport is shared across the crates so each crate's cost includes it. */
async function addToStock(supabase: SupabaseClient, purchaseId: string, supplierId: string | null, date: string, transport: number, items: Item[]) {
  const totalCrates = items.reduce((s, i) => s + i.crates, 0);
  const perCrate = totalCrates ? transport / totalCrates : 0;
  const rows = items.filter((i) => i.crates > 0).map((i) => ({
    product_id: i.product_id, kind: "in", crates: i.crates, moved_on: date, purchase_id: purchaseId, supplier_id: supplierId,
    unit_cost: Math.round((i.unit_cost + perCrate) * 100) / 100,
  }));
  if (rows.length) {
    const { error } = await supabase.from("stock_movements").insert(rows);
    if (error) throw new Error(error.message);
  }
}

export async function createPurchase(f: FormData) {
  const { supabase } = await requireMember();
  const from = "/purchases/new";
  const products = f.getAll("product_id").map(String);
  const crates = f.getAll("crates").map((v) => Number(v));
  const costs = f.getAll("unit_cost").map((v) => Number(String(v).replace(/[,₦\s]/g, "")));
  const lines = products.map((p, i) => ({ product_id: p, crates: crates[i], unit_cost: costs[i] })).filter((l) => l.product_id && l.crates);
  if (!lines.length) redirect(back(from, "Add at least one egg size with crates."));
  if (lines.some((l) => !Number.isInteger(l.crates) || l.crates <= 0 || !(l.unit_cost >= 0))) redirect(back(from, "Check the crates and cost on each line."));
  const arrived = str(f, "arrived") === "yes";
  const date = str(f, "ordered_on") || todayLagos();
  const transport = num(f, "transport_cost") || 0;

  let supplierId: string | null;
  try { supplierId = await supplierIdFor(supabase, str(f, "supplier")); }
  catch (e) { redirect(back(from, (e as Error).message)); }

  const { data: pu, error } = await supabase.from("purchases").insert({
    supplier_id: supplierId, ordered_on: date, expected_on: arrived ? null : str(f, "expected_on") || null,
    received_on: arrived ? date : null, status: arrived ? "received" : "expected", transport_cost: transport, notes: str(f, "notes") || null,
  }).select("id").single();
  if (error) redirect(back(from, error.message));

  const { data: items, error: iErr } = await supabase.from("purchase_items").insert(lines.map((l) => ({
    purchase_id: pu.id, product_id: l.product_id, crates_ordered: l.crates, unit_cost: l.unit_cost, crates_received: arrived ? l.crates : null,
  }))).select("id, product_id, crates_ordered, unit_cost");
  if (iErr) {
    await supabase.from("purchases").delete().eq("id", pu.id);
    redirect(back(from, iErr.message));
  }
  if (arrived) {
    try {
      await addToStock(supabase, pu.id, supplierId, date, transport, items.map((i) => ({ id: i.id, product_id: i.product_id, crates: i.crates_ordered, unit_cost: Number(i.unit_cost) })));
    } catch (e) {
      redirect(back(`/purchases/${pu.id}`, "Saved, but stock wasn't updated: " + (e as Error).message));
    }
  }
  revalidatePath("/", "layout");
  redirect(back(`/purchases/${pu.id}`, arrived ? "Stock received and added to the store." : "Order saved. Mark it received when it arrives.", "ok"));
}

export async function receivePurchase(f: FormData) {
  const { supabase } = await requireMember();
  const id = str(f, "id");
  const here = `/purchases/${id}`;
  const date = str(f, "received_on") || todayLagos();
  const { data: pu } = await supabase.from("purchases").select("id, status, supplier_id, transport_cost").eq("id", id).maybeSingle();
  if (!pu || pu.status !== "expected") redirect(back(here, "This delivery was already received or cancelled."));
  const { data: items } = await supabase.from("purchase_items").select("id, product_id, crates_ordered, unit_cost").eq("purchase_id", id);
  const got = (items ?? []).map((i) => {
    const v = f.get(`received_${i.id}`);
    const n = v == null || v === "" ? i.crates_ordered : Number(v);
    return { id: i.id, product_id: i.product_id, crates: n, unit_cost: Number(i.unit_cost) };
  });
  if (got.some((g) => !Number.isInteger(g.crates) || g.crates < 0)) redirect(back(here, "Enter whole numbers for crates received."));
  if (got.every((g) => g.crates === 0)) redirect(back(here, "Nothing received? Cancel the order instead."));

  for (const g of got) {
    const { error } = await supabase.from("purchase_items").update({ crates_received: g.crates }).eq("id", g.id);
    if (error) redirect(back(here, error.message));
  }
  const { error } = await supabase.from("purchases").update({ status: "received", received_on: date }).eq("id", id);
  if (error) redirect(back(here, error.message));
  try {
    await addToStock(supabase, id, pu.supplier_id, date, Number(pu.transport_cost), got);
  } catch (e) {
    redirect(back(here, "Marked received, but stock wasn't updated: " + (e as Error).message));
  }
  revalidatePath("/", "layout");
  redirect(back(here, "Received. The crates are now in stock.", "ok"));
}

export async function cancelPurchase(f: FormData) {
  const { supabase } = await requireMember();
  const id = str(f, "id");
  const { error } = await supabase.from("purchases").update({ status: "cancelled" }).eq("id", id).eq("status", "expected");
  if (error) redirect(back(`/purchases/${id}`, error.message));
  revalidatePath("/", "layout");
  redirect(back("/purchases", "Order cancelled.", "ok"));
}

export async function deletePurchase(f: FormData) {
  const { supabase } = await requireOwner();
  const id = str(f, "id");
  const { error } = await supabase.from("purchases").delete().eq("id", id);
  if (error) redirect(back(`/purchases/${id}`, error.message));
  revalidatePath("/", "layout");
  redirect(back("/purchases", "Purchase deleted and its crates taken out of stock.", "ok"));
}
