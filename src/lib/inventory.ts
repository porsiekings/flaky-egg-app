import type { SupabaseClient } from "@supabase/supabase-js";
import { daysSince } from "./format";

export type ProductStock = {
  id: string; name: string; sell_price: number; low_stock_level: number; sort_order: number; active: boolean;
  crates_in: number; crates_sold: number; crates_spoilt: number; crates_adjust: number; on_hand: number;
  stock_value: number; oldest_batch: string | null; avg_cost: number | null; on_order_to_customers: number; incoming: number;
};

export async function stockByProduct(supabase: SupabaseClient, includeInactive = false) {
  let q = supabase.from("stock_by_product").select("*").order("sort_order").order("name");
  if (!includeInactive) q = q.eq("active", true);
  const { data } = await q;
  return ((data ?? []) as ProductStock[]).map((p) => ({
    ...p,
    on_hand: Number(p.on_hand), stock_value: Number(p.stock_value), sell_price: Number(p.sell_price),
    avg_cost: p.avg_cost == null ? null : Number(p.avg_cost),
  }));
}

export type Age = { days: number | null; level: "fresh" | "aging" | "old" | "none" };

export function ageOf(oldest: string | null, onHand: number, agingDays: number, oldDays: number): Age {
  if (!oldest || onHand <= 0) return { days: null, level: "none" };
  const days = daysSince(oldest) ?? 0;
  return { days, level: days >= oldDays ? "old" : days >= agingDays ? "aging" : "fresh" };
}

export function AgeText(a: Age) {
  if (a.days == null) return "";
  return a.days === 0 ? "Oldest: today" : `Oldest: ${a.days} day${a.days === 1 ? "" : "s"}`;
}
