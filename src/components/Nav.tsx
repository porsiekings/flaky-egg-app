"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

type Item = { href: string; label: string; icon: string; ownerOnly?: boolean };

export const NAV: Item[] = [
  { href: "/", label: "Home", icon: "M3 11l9-8 9 8v9a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1z" },
  { href: "/stock", label: "Stock", icon: "M21 8l-9-5-9 5 9 5 9-5zM3 8v8l9 5 9-5V8M12 13v8" },
  { href: "/purchases", label: "Purchases", icon: "M3 7l2-4h14l2 4M3 7h18v13a1 1 0 01-1 1H4a1 1 0 01-1-1zM9 11h6" },
  { href: "/sales", label: "Sales", icon: "M3 3h2l2.4 12.2a2 2 0 002 1.8h8.2a2 2 0 002-1.6L21 8H6M9 21a1 1 0 100-2 1 1 0 000 2zm9 0a1 1 0 100-2 1 1 0 000 2z" },
  { href: "/customers", label: "Customers", icon: "M17 21v-2a4 4 0 00-4-4H7a4 4 0 00-4 4v2M10 11a4 4 0 100-8 4 4 0 000 8zm11 10v-2a4 4 0 00-3-3.9M16 3.1a4 4 0 010 7.8" },
  { href: "/orders", label: "Orders", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" },
  { href: "/suppliers", label: "Suppliers", icon: "M1 6h13v10H1zM14 10h4l3 3v3h-7M5.5 19a1.5 1.5 0 100-3 1.5 1.5 0 000 3zm12 0a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" },
  { href: "/payments", label: "Payments", icon: "M3 7h18v10H3zM3 10h18M7 15h3" },
  { href: "/expenses", label: "Expenses", icon: "M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6", ownerOnly: true },
  { href: "/reports", label: "Reports", icon: "M4 20V10m6 10V4m6 16v-7m4 7H2", ownerOnly: true },
  { href: "/settings", label: "Settings", icon: "M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z", ownerOnly: true },
];

const MOBILE = ["/", "/stock", "/sales", "/customers"];

function Icon({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

const isActive = (path: string, href: string) => (href === "/" ? path === "/" : path.startsWith(href));

export function SideNav({ isOwner, business }: { isOwner: boolean; business: string }) {
  const path = usePathname();
  return (
    <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-white/70 bg-paper-card/60 p-4 shadow-[8px_0_30px_-20px_rgba(31,29,26,.35)] backdrop-blur-xl md:flex">
      <div className="mb-6 px-2">
        <div className="text-[11px] uppercase tracking-[.14em] text-ink-muted">Egg distribution</div>
        <div className="font-serif text-lg leading-tight">{business}</div>
      </div>
      <nav className="flex flex-col gap-1">
        {NAV.filter((n) => isOwner || !n.ownerOnly).map((n) => (
          <Link key={n.href} href={n.href}
            className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition ${isActive(path, n.href) ? "bg-gradient-to-b from-[#36b07c] to-brand-600 text-white shadow-[0_8px_18px_-8px_rgba(37,130,90,.7)]" : "text-ink-muted hover:bg-paper hover:text-ink"}`}>
            <Icon d={n.icon} />{n.label}
          </Link>
        ))}
      </nav>
      <form action="/logout" method="post" className="mt-auto">
        <button className="w-full rounded-xl px-3 py-2 text-left text-sm text-ink-muted hover:bg-paper">Sign out</button>
      </form>
    </aside>
  );
}

export function BottomNav() {
  const path = usePathname();
  const items = NAV.filter((n) => MOBILE.includes(n.href));
  const moreActive = !MOBILE.some((h) => isActive(path, h));
  return (
    <nav className="fixed inset-x-3 bottom-[max(12px,env(safe-area-inset-bottom))] z-30 rounded-[22px] border border-white/80 bg-paper-card/80 py-1 shadow-[inset_0_1px_0_rgba(255,255,255,.9),0_18px_40px_-14px_rgba(31,29,26,.45)] backdrop-blur-xl md:hidden">
      <div className="grid grid-cols-5">
        {items.map((n) => (
          <Link key={n.href} href={n.href} className={`flex flex-col items-center gap-0.5 py-2 text-[11px] ${isActive(path, n.href) ? "text-brand-600" : "text-ink-muted"}`}>
            <Icon d={n.icon} />{n.label}
          </Link>
        ))}
        <Link href="/more" className={`flex flex-col items-center gap-0.5 py-2 text-[11px] ${moreActive ? "text-brand-600" : "text-ink-muted"}`}>
          <Icon d="M5 12h.01M12 12h.01M19 12h.01" />More
        </Link>
      </div>
    </nav>
  );
}
