import Link from "next/link";
import { todayLagos } from "@/lib/format";

export const PERIODS = { today: "Today", week: "7 days", month: "This month", all: "All time" } as const;
export type Period = keyof typeof PERIODS;

export function periodStart(p: Period): string | null {
  const today = todayLagos();
  if (p === "today") return today;
  if (p === "week") {
    const d = new Date(today + "T12:00:00"); d.setDate(d.getDate() - 6);
    return d.toISOString().slice(0, 10);
  }
  if (p === "month") return today.slice(0, 8) + "01";
  return null;
}

export const asPeriod = (v?: string): Period => (v && v in PERIODS ? (v as Period) : "month");

export function PeriodTabs({ current, base }: { current: Period; base: string }) {
  return (
    <div className="mb-4 inline-flex rounded-full bg-ink/5 p-1 text-sm">
      {(Object.keys(PERIODS) as Period[]).map((p) => (
        <Link key={p} href={`${base}?period=${p}`} className={`rounded-full px-3 py-1.5 ${current === p ? "bg-white font-semibold shadow-sm" : "text-ink-muted"}`}>
          {PERIODS[p]}
        </Link>
      ))}
    </div>
  );
}
