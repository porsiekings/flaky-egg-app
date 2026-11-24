"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireMember, requireOwner } from "@/lib/auth";
import { customerIdFor } from "@/lib/customers";
import { back, num, str } from "@/lib/forms";
import { todayLagos } from "@/lib/format";

export async function addSale(f: FormData) {
  const { supabase } = await requireMember();
  const crates = num(f, "crates"), price = num(f, "unit_price"), paidNow = num(f, "paid_now") || 0;
  const orderId = str(f, "order_id") || null;
  const from = orderId ? `/orders/${orderId}/deliver` : "/sales/new";
  if (!(crates > 0) || !Number.isInteger(crates)) redirect(back(from, "Enter a whole number of crates."));
  if (!(price >= 0)) redirect(back(from, "Enter the price per crate."));
  if (paidNow < 0 || paidNow > crates * price) redirect(back(from, "The amount paid can't be more than the total."));
  const saleDate = str(f, "sale_date") || todayLagos();

  let customerId: string;
  try {
    customerId = await customerIdFor(supabase, str(f, "customer"));
  } catch (e) {
    redirect(back(from, (e as Error).message));
  }

  const { data: sale, error } = await supabase.from("sales")
    .insert({ customer_id: customerId, sale_date: saleDate, crates, unit_price: price, notes: str(f, "notes") || null, order_id: orderId })
    .select("id").single();
  if (error) redirect(back(from, "Couldn't save the sale: " + error.message));

  if (paidNow > 0) {
    const { error: pErr } = await supabase.from("payments").insert({
      customer_id: customerId, sale_id: sale.id, amount: paidNow, paid_on: saleDate, method: str(f, "method") || "cash",
    });
    if (pErr) redirect(back(`/sales/${sale.id}`, "Sale saved, but the payment wasn't: " + pErr.message + ". Add it from Payments."));
  }

  if (orderId) await supabase.from("orders").update({ status: "delivered", sale_id: sale.id }).eq("id", orderId);

  revalidatePath("/", "layout");
  redirect(back("/sales", "Sale saved.", "ok"));
}

export async function deleteSale(f: FormData) {
  const { supabase } = await requireOwner();
  const id = str(f, "id");
  await supabase.from("payments").delete().eq("sale_id", id);
  await supabase.from("orders").update({ status: "pending", sale_id: null }).eq("sale_id", id);
  const { error } = await supabase.from("sales").delete().eq("id", id);
  if (error) redirect(back(`/sales/${id}`, "Couldn't delete: " + error.message));
  revalidatePath("/", "layout");
  redirect(back("/sales", "Sale deleted.", "ok"));
}
