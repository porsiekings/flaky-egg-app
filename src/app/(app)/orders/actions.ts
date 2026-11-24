"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireMember, requireOwner } from "@/lib/auth";
import { customerIdFor } from "@/lib/customers";
import { back, num, str } from "@/lib/forms";

export async function addOrder(f: FormData) {
  const { supabase } = await requireMember();
  const crates = num(f, "crates"), price = num(f, "unit_price");
  const productId = str(f, "product_id");
  if (!productId) redirect(back("/orders/new", "Choose the egg size."));
  if (!(crates > 0) || !Number.isInteger(crates)) redirect(back("/orders/new", "Enter a whole number of crates."));
  if (!(price >= 0)) redirect(back("/orders/new", "Enter the price per crate."));
  let customerId: string;
  try { customerId = await customerIdFor(supabase, str(f, "customer")); }
  catch (e) { redirect(back("/orders/new", (e as Error).message)); }
  const { error } = await supabase.from("orders").insert({
    customer_id: customerId, product_id: productId, crates, unit_price: price, due_date: str(f, "due_date") || null, notes: str(f, "notes") || null,
  });
  if (error) redirect(back("/orders/new", error.message));
  revalidatePath("/", "layout");
  redirect(back("/orders", "Order saved.", "ok"));
}

export async function cancelOrder(f: FormData) {
  const { supabase } = await requireMember();
  const { error } = await supabase.from("orders").update({ status: "cancelled" }).eq("id", str(f, "id")).eq("status", "pending");
  if (error) redirect(back("/orders", error.message));
  revalidatePath("/", "layout");
  redirect(back("/orders", "Order cancelled.", "ok"));
}

export async function deleteOrder(f: FormData) {
  const { supabase } = await requireOwner();
  const { error } = await supabase.from("orders").delete().eq("id", str(f, "id")).neq("status", "delivered");
  if (error) redirect(back("/orders", error.message));
  revalidatePath("/", "layout");
  redirect(back("/orders", "Order deleted.", "ok"));
}
