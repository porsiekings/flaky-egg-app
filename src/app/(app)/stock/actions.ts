"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireMember, requireOwner } from "@/lib/auth";
import { back, num, str } from "@/lib/forms";
import { todayLagos } from "@/lib/format";

export async function addStock(f: FormData) {
  const { supabase } = await requireMember();
  const kind = str(f, "kind");
  const productId = str(f, "product_id");
  const crates = num(f, "crates");
  const date = str(f, "moved_on") || todayLagos();
  const from = str(f, "from") || "/stock";
  if (!productId) redirect(back(from, "Choose the egg size."));
  if (!["opening", "spoilt", "count"].includes(kind)) redirect(back(from, "Choose what happened."));
  if (!Number.isInteger(crates) || (kind !== "count" && crates <= 0) || (kind === "count" && crates < 0)) redirect(back(from, "Enter a whole number of crates."));

  let row: Record<string, unknown>;
  if (kind === "count") {
    const { data: p } = await supabase.from("stock_by_product").select("on_hand").eq("id", productId).maybeSingle();
    const diff = crates - Number(p?.on_hand ?? 0);
    if (diff === 0) redirect(back(from, "The count already matches. Nothing to change.", "ok"));
    row = { product_id: productId, kind: "adjust", crates: diff, moved_on: date, notes: str(f, "notes") || `Counted ${crates} crates` };
  } else {
    const cost = num(f, "unit_cost");
    if (kind === "opening" && !(cost >= 0)) redirect(back(from, "Enter what she paid per crate for the old stock (an estimate is fine)."));
    row = { product_id: productId, kind, crates, moved_on: date, notes: str(f, "notes") || null, unit_cost: kind === "opening" ? cost : null };
  }
  const { error } = await supabase.from("stock_movements").insert(row);
  if (error) redirect(back(from, error.message));
  revalidatePath("/", "layout");
  redirect(back(from, kind === "opening" ? "Old stock added." : kind === "spoilt" ? "Spoilt crates recorded." : "Stock count corrected.", "ok"));
}

export async function deleteMovement(f: FormData) {
  const { supabase } = await requireOwner();
  const from = str(f, "from") || "/stock";
  const { error } = await supabase.from("stock_movements").delete().eq("id", str(f, "id")).is("purchase_id", null);
  if (error) redirect(back(from, error.message));
  revalidatePath("/", "layout");
  redirect(back(from, "Entry deleted.", "ok"));
}
