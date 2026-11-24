"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireMember, requireOwner } from "@/lib/auth";
import { back, str } from "@/lib/forms";

export async function addCustomer(f: FormData) {
  const { supabase } = await requireMember();
  const name = str(f, "name").replace(/\s+/g, " ");
  if (!name) redirect(back("/customers/new", "Enter the customer's name."));
  const { data, error } = await supabase.from("customers")
    .insert({ name, phone: str(f, "phone") || null, address: str(f, "address") || null, notes: str(f, "notes") || null })
    .select("id").single();
  if (error) redirect(back("/customers/new", error.code === "23505" ? "A customer with that name already exists." : error.message));
  revalidatePath("/customers");
  redirect(`/customers/${data.id}`);
}

export async function updateCustomer(f: FormData) {
  const { supabase } = await requireOwner();
  const id = str(f, "id");
  const { error } = await supabase.from("customers")
    .update({ name: str(f, "name"), phone: str(f, "phone") || null, address: str(f, "address") || null, notes: str(f, "notes") || null })
    .eq("id", id);
  if (error) redirect(back(`/customers/${id}?edit=1`, error.code === "23505" ? "Another customer already has that name." : error.message));
  revalidatePath("/", "layout");
  redirect(back(`/customers/${id}`, "Customer updated.", "ok"));
}
