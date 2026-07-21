import Link from "next/link";
import { fmtInt } from "../lib/format";

export function Pagination({
  basePath,
  params,
  page,
  pageSize,
  total,
}: {
  basePath: string;
  params: Record<string, string | undefined>;
  page: number;
  pageSize: number;
  total: number;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const href = (p: number) => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v) sp.set(k, v);
    if (p > 1) sp.set("page", String(p));
    const qs = sp.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };
  const btn =
    "rounded-md border border-slate-700 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-800";
  const disabled = "pointer-events-none opacity-40";

  return (
    <div className="mt-4 flex items-center justify-between gap-4">
      <p className="text-sm text-slate-400">
        {fmtInt(total)} result{total === 1 ? "" : "s"}
        {total > 0 && (
          <span className="text-slate-500">
            {" "}
            · page {fmtInt(page)} of {fmtInt(pages)}
          </span>
        )}
      </p>
      <div className="flex gap-2">
        <Link href={href(page - 1)} className={`${btn} ${page <= 1 ? disabled : ""}`} aria-disabled={page <= 1}>
          ← Prev
        </Link>
        <Link href={href(page + 1)} className={`${btn} ${page >= pages ? disabled : ""}`} aria-disabled={page >= pages}>
          Next →
        </Link>
      </div>
    </div>
  );
}
