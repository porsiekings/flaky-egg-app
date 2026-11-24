import type { SupabaseClient } from "@supabase/supabase-js";

/** Find a customer by name (case-insensitive), or create them. Returns the id. */
export async function customerIdFor(supabase: SupabaseClient, rawName: string, phone?: string | null) {
  const name = rawName.trim().replace(/\s+/g, " ");
  if (!name) throw new Error("Please enter the customer's name.");
  const { data: found } = await supabase.from("customers").select("id").ilike("name", name.replace(/[%_\\]/g, "\\$&")).limit(1).maybeSingle();
  if (found) return found.id as string;
  const { data, error } = await supabase.from("customers").insert({ name, phone: phone || null }).select("id").single();
  if (error) throw new Error("Couldn't save the customer: " + error.message);
  return data.id as string;
}
