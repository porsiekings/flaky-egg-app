"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireOwner } from "@/lib/auth";
import { back, num, str } from "@/lib/forms";

export async function saveSettings(f: FormData) {
  const { supabase } = await requireOwner();
  const aging = num(f, "aging_days"), old = num(f, "old_days");
  if (!(aging >= 1) || !(old > aging)) redirect(back("/settings", "“Old” must be more days than “sell first”."));
  const { error } = await supabase.from("settings").update({
    business_name: str(f, "business_name") || "Flaky Egg Distributor",
    aging_days: Math.round(aging), old_days: Math.round(old), updated_at: new Date().toISOString(),
  }).eq("id", 1);
  if (error) redirect(back("/settings", error.message));
  revalidatePath("/", "layout");
  redirect(back("/settings", "Settings saved.", "ok"));
}

export async function saveProduct(f: FormData) {
  const { supabase } = await requireOwner();
  const id = str(f, "id");
  const name = str(f, "name").replace(/\s+/g, " ");
  const price = num(f, "sell_price"), low = num(f, "low_stock_level"), sort = num(f, "sort_order");
  if (!name) redirect(back("/settings", "Enter a name for the egg size."));
  if (!(price >= 0) || !(low >= 0)) redirect(back("/settings", "Check the price and low-stock number."));
  const row = { name, sell_price: price, low_stock_level: Math.round(low), sort_order: Number.isFinite(sort) ? Math.round(sort) : 0, active: str(f, "active") !== "no" };
  const { error } = id ? await supabase.from("products").update(row).eq("id", id) : await supabase.from("products").insert(row);
  if (error) redirect(back("/settings", error.code === "23505" ? "There's already a size with that name." : error.message));
  revalidatePath("/", "layout");
  redirect(back("/settings", id ? `${name} updated.` : `${name} added.`, "ok"));
}

export async function changePassword(f: FormData) {
  const { supabase } = await requireOwner();
  const pw = str(f, "password");
  if (pw.length < 8) redirect(back("/settings", "Use at least 8 characters for the password."));
  const { error } = await supabase.auth.updateUser({ password: pw });
  if (error) redirect(back("/settings", error.message));
  redirect(back("/settings", "Password changed.", "ok"));
}
