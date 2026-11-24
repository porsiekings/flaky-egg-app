"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireMember, requireOwner } from "@/lib/auth";
import { back, str } from "@/lib/forms";

const fields = (f: FormData) => ({ name: str(f, "name").replace(/\s+/g, " "), phone: str(f, "phone") || null, address: str(f, "address") || null, notes: str(f, "notes") || null });

export async function addSupplier(f: FormData) {
  const { supabase } = await requireMember();
  const row = fields(f);
  if (!row.name) redirect(back("/suppliers", "Enter the supplier's name."));
  const { data, error } = await supabase.from("suppliers").insert(row).select("id").single();
  if (error) redirect(back("/suppliers", error.code === "23505" ? "A supplier with that name already exists." : error.message));
  revalidatePath("/suppliers");
  redirect(`/suppliers/${data.id}`);
}

export async function updateSupplier(f: FormData) {
  const { supabase } = await requireOwner();
  const id = str(f, "id");
  const { error } = await supabase.from("suppliers").update(fields(f)).eq("id", id);
  if (error) redirect(back(`/suppliers/${id}?edit=1`, error.code === "23505" ? "Another supplier already has that name." : error.message));
  revalidatePath("/", "layout");
  redirect(back(`/suppliers/${id}`, "Supplier updated.", "ok"));
}
