import Link from "next/link";
import { NAV } from "@/components/Nav";
import { requireMember } from "@/lib/auth";

export default async function MorePage() {
  const { member } = await requireMember();
  const items = NAV.filter((n) => !["/", "/sales", "/customers", "/orders"].includes(n.href) && (member.role === "owner" || !n.ownerOnly));
  return (
    <div className="space-y-4">
      <h1 className="h1">More</h1>
      <div className="card divide-y divide-ink-line p-0">
        {items.map((n) => (
          <Link key={n.href} href={n.href} className="flex items-center justify-between px-4 py-4 text-base">
            {n.label}<span className="text-ink-muted">›</span>
          </Link>
        ))}
      </div>
      <form action="/logout" method="post"><button className="btn-ghost w-full">Sign out</button></form>
    </div>
  );
}
