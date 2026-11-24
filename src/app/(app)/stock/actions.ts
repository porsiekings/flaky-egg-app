"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireMember, requireOwner } from "@/lib/auth";
import { back, num, str } from "@/lib/forms";
import { todayLagos } from "@/lib/format";

export async function addStock(f: FormData) {
  const { supabase } = await requireMember();
  const kind = str(f, "kind");
  const crates = num(f, "crates");
  const date = str(f, "moved_on") || todayLagos();
  if (!["in", "spoilt", "count"].includes(kind)) redirect(back("/stock", "Choose what happened."));
  if (!Number.isInteger(crates) || (kind !== "count" && crates <= 0) || (kind === "count" && crates < 0)) redirect(back("/stock", "Enter a whole number of crates."));

  let row: Record<string, unknown>;
  if (kind === "count") {
    const { data: lvl } = await supabase.from("stock_level").select("crates_in_stock").maybeSingle();
    const diff = crates - Number(lvl?.crates_in_stock ?? 0);
    if (diff === 0) redirect(back("/stock", "The count already matches. Nothing to change.", "ok"));
    row = { kind: "adjust", crates: diff, moved_on: date, notes: str(f, "notes") || `Stock count: ${crates} crates` };
  } else {
    const cost = num(f, "unit_cost");
    row = {
      kind, crates, moved_on: date, notes: str(f, "notes") || null,
      unit_cost: kind === "in" && cost >= 0 ? cost : null,
      supplier: kind === "in" ? str(f, "supplier") || null : null,
    };
  }
  const { error } = await supabase.from("stock_movements").insert(row);
  if (error) redirect(back("/stock", error.message));
  revalidatePath("/", "layout");
  redirect(back("/stock", kind === "in" ? "Stock added." : kind === "spoilt" ? "Spoilt crates recorded." : "Stock count corrected.", "ok"));
}

export async function deleteMovement(f: FormData) {
  const { supabase } = await requireOwner();
  const { error } = await supabase.from("stock_movements").delete().eq("id", str(f, "id"));
  if (error) redirect(back("/stock", error.message));
  revalidatePath("/", "layout");
  redirect(back("/stock", "Entry deleted.", "ok"));
}
