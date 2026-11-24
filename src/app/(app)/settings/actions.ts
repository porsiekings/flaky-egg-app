"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireOwner } from "@/lib/auth";
import { back, num, str } from "@/lib/forms";

export async function saveSettings(f: FormData) {
  const { supabase } = await requireOwner();
  const price = num(f, "default_crate_price"), low = num(f, "low_stock_level"), opening = num(f, "opening_stock");
  if (!(price >= 0) || !(low >= 0) || !Number.isFinite(opening)) redirect(back("/settings", "Please check the numbers."));
  const { error } = await supabase.from("settings").update({
    business_name: str(f, "business_name") || "Flaky Egg Distributor",
    default_crate_price: price, low_stock_level: Math.round(low), opening_stock: Math.round(opening), updated_at: new Date().toISOString(),
  }).eq("id", 1);
  if (error) redirect(back("/settings", error.message));
  revalidatePath("/", "layout");
  redirect(back("/settings", "Settings saved.", "ok"));
}

export async function changePassword(f: FormData) {
  const { supabase } = await requireOwner();
  const pw = str(f, "password");
  if (pw.length < 8) redirect(back("/settings", "Use at least 8 characters for the password."));
  const { error } = await supabase.auth.updateUser({ password: pw });
  if (error) redirect(back("/settings", error.message));
  redirect(back("/settings", "Password changed.", "ok"));
}
