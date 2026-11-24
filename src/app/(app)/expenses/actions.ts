"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireOwner } from "@/lib/auth";
import { back, num, str } from "@/lib/forms";
import { todayLagos } from "@/lib/format";

export async function addExpense(f: FormData) {
  const { supabase } = await requireOwner();
  const amount = num(f, "amount");
  if (!(amount > 0)) redirect(back("/expenses", "Enter the amount spent."));
  const { error } = await supabase.from("expenses").insert({
    amount, category: str(f, "category") || "Other", spent_on: str(f, "spent_on") || todayLagos(), notes: str(f, "notes") || null,
  });
  if (error) redirect(back("/expenses", error.message));
  revalidatePath("/", "layout");
  redirect(back("/expenses", "Expense saved.", "ok"));
}

export async function deleteExpense(f: FormData) {
  const { supabase } = await requireOwner();
  const { error } = await supabase.from("expenses").delete().eq("id", str(f, "id"));
  if (error) redirect(back("/expenses", error.message));
  revalidatePath("/", "layout");
  redirect(back("/expenses", "Expense deleted.", "ok"));
}
