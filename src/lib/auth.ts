import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type Member = { user_id: string; full_name: string | null; role: "owner" | "staff" };
export type Settings = {
  business_name: string;
  default_crate_price: number;
  aging_days: number;
  old_days: number;
};

/** Signed-in user, their team membership and the business settings. Redirects to /login if signed out. */
export const getSession = cache(async () => {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const [{ data: member }, { data: settings }] = await Promise.all([
    supabase.from("members").select("user_id, full_name, role").eq("user_id", user.id).maybeSingle(),
    supabase.from("settings").select("business_name, default_crate_price, aging_days, old_days").eq("id", 1).maybeSingle(),
  ]);
  return {
    supabase,
    user,
    member: member as Member | null,
    settings: (settings ?? { business_name: "Flaky Egg Distributor", default_crate_price: 5400, aging_days: 10, old_days: 14 }) as Settings,
  };
});

export async function requireMember() {
  const s = await getSession();
  if (!s.member) redirect("/no-access");
  return s as typeof s & { member: Member };
}

export async function requireOwner() {
  const s = await requireMember();
  if (s.member.role !== "owner") redirect("/");
  return s;
}
