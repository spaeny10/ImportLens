export function fmtInt(n: number | null | undefined): string {
  return (n ?? 0).toLocaleString("en-US");
}

export function fmtWeight(kg: number | null | undefined): string {
  const v = kg ?? 0;
  if (v >= 1_000_000) return `${(v / 1_000_000).toLocaleString("en-US", { maximumFractionDigits: 1 })}k t`;
  if (v >= 1_000) return `${(v / 1_000).toLocaleString("en-US", { maximumFractionDigits: 1 })} t`;
  return `${v.toLocaleString("en-US")} kg`;
}

export function fmtDate(d: string | Date | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d + (d.length === 10 ? "T00:00:00Z" : "")) : d;
  return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" });
}

export function fmtMonth(ym: string): string {
  const [y, m] = ym.split("-");
  return new Date(Date.UTC(+y, +m - 1, 1)).toLocaleDateString("en-US", {
    month: "short",
    year: "2-digit",
    timeZone: "UTC",
  });
}
