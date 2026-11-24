export const naira = (v: number | string | null | undefined) =>
  "₦" + Math.round(Number(v) || 0).toLocaleString("en-NG");

export const nairaShort = (v: number) => {
  const n = Math.abs(v);
  if (n >= 1_000_000) return "₦" + (v / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1) + "M";
  if (n >= 1_000) return "₦" + Math.round(v / 1_000) + "k";
  return naira(v);
};

export const count = (v: number | string | null | undefined) => (Number(v) || 0).toLocaleString("en-NG");

export const shortDate = (d: string | null | undefined) =>
  d ? new Date(d + (d.length === 10 ? "T12:00:00" : "")).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" }) : "—";

/** Today's date in Lagos as YYYY-MM-DD. */
export const todayLagos = () => new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Lagos" });

export const daysSince = (d: string | null | undefined) => {
  if (!d) return null;
  const ms = new Date(todayLagos() + "T12:00:00").getTime() - new Date(d + "T12:00:00").getTime();
  return Math.max(0, Math.round(ms / 86_400_000));
};

/** Turn a phone number like 0803... into WhatsApp's 234803... format. */
export const waNumber = (phone: string | null | undefined) => {
  if (!phone) return null;
  let p = phone.replace(/[^\d+]/g, "");
  if (p.startsWith("+")) p = p.slice(1);
  if (p.startsWith("0")) p = "234" + p.slice(1);
  return p.length >= 10 ? p : null;
};
