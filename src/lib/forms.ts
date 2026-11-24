export const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
export const num = (f: FormData, k: string) => {
  const v = Number(String(f.get(k) ?? "").replace(/[,₦\s]/g, ""));
  return Number.isFinite(v) ? v : NaN;
};
export const back = (path: string, msg: string, kind: "error" | "ok" = "error") =>
  `${path}${path.includes("?") ? "&" : "?"}${kind}=${encodeURIComponent(msg)}`;
