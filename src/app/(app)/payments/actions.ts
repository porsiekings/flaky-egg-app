"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireMember, requireOwner } from "@/lib/auth";
import { back, num, str } from "@/lib/forms";
import { todayLagos } from "@/lib/format";

export async function addPayment(f: FormData) {
  const { supabase } = await requireMember();
  const customerId = str(f, "customer_id");
  const amount = num(f, "amount");
  const from = str(f, "from") || "/payments/new";
  if (!customerId) redirect(back(from, "Choose a customer."));
  if (!(amount > 0)) redirect(back(from, "Enter the amount received."));
  const { error } = await supabase.from("payments").insert({
    customer_id: customerId, amount, paid_on: str(f, "paid_on") || todayLagos(), method: str(f, "method") || "cash", notes: str(f, "notes") || null,
  });
  if (error) redirect(back(from, "Couldn't save the payment: " + error.message));
  revalidatePath("/", "layout");
  redirect(back(str(f, "done") || "/payments", "Payment saved.", "ok"));
}

export async function deletePayment(f: FormData) {
  const { supabase } = await requireOwner();
  const { error } = await supabase.from("payments").delete().eq("id", str(f, "id"));
  if (error) redirect(back("/payments", error.message));
  revalidatePath("/", "layout");
  redirect(back("/payments", "Payment deleted.", "ok"));
}
