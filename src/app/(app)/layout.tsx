import { BottomNav, SideNav } from "@/components/Nav";
import { requireMember } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { member, settings } = await requireMember();
  return (
    <div className="flex min-h-screen">
      <SideNav isOwner={member.role === "owner"} business={settings.business_name} />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-32 pt-5 sm:px-6 md:pb-10">{children}</main>
      <BottomNav />
    </div>
  );
}
