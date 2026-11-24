import type { Age } from "@/lib/inventory";

export function AgeBadge({ age }: { age: Age }) {
  if (age.days == null) return null;
  const cls = age.level === "old" ? "pill bg-red-100 text-red-700" : age.level === "aging" ? "pill-warn" : "pill-ok";
  const word = age.level === "old" ? "Old — sell now" : age.level === "aging" ? "Sell first" : "Fresh";
  return <span className={cls}>{word} · {age.days}d</span>;
}
