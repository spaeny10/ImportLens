import Link from "next/link";
import { searchCompanies } from "../../../lib/queries";
import { fmtDate, fmtInt, fmtWeight } from "../../../lib/format";
import { PageHeader } from "../../../components/ui";
import { Pagination } from "../../../components/pagination";

export const metadata = { title: "Companies — ImportLens" };
export const dynamic = "force-dynamic";

type SP = { [key: string]: string | string[] | undefined };
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

const tabClass = (active: boolean) =>
  `rounded-md px-3 py-1.5 text-sm font-medium ${
    active ? "bg-slate-800 text-white" : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
  }`;

export default async function CompaniesPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const q = one(sp.q) ?? "";
  const role = (one(sp.role) as "importer" | "supplier" | undefined) ?? "all";
  const page = Math.max(1, parseInt(one(sp.page) ?? "1", 10) || 1);

  const results = await searchCompanies({ q, role: role === "all" ? undefined : role, page });
  const roleHref = (r: string) =>
    `/companies?${new URLSearchParams({ ...(q ? { q } : {}), ...(r !== "all" ? { role: r } : {}) })}`;

  return (
    <>
      <PageHeader
        title="Company directory"
        subtitle="Importers and suppliers derived from bill-of-lading party records"
      />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <form method="GET" action="/companies" className="flex flex-1 gap-2">
          {role !== "all" && <input type="hidden" name="role" value={role} />}
          <input
            name="q"
            defaultValue={q}
            placeholder="Search company names…"
            className="w-full max-w-md rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
          />
          <button type="submit" className="rounded-md bg-sky-500 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-400">
            Search
          </button>
        </form>
        <div className="flex gap-1">
          <Link href={roleHref("all")} className={tabClass(role === "all")}>All</Link>
          <Link href={roleHref("importer")} className={tabClass(role === "importer")}>Importers</Link>
          <Link href={roleHref("supplier")} className={tabClass(role === "supplier")}>Suppliers</Link>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-800">
        <table className="w-full min-w-[820px] text-sm">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-900 text-left text-xs uppercase tracking-wide text-slate-400">
              <th className="px-4 py-3 font-medium">Company</th>
              <th className="px-4 py-3 font-medium">Location</th>
              <th className="px-4 py-3 text-right font-medium">As importer</th>
              <th className="px-4 py-3 text-right font-medium">As supplier</th>
              <th className="px-4 py-3 text-right font-medium">Gross weight</th>
              <th className="px-4 py-3 text-right font-medium">Last shipment</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/70 bg-slate-950/40">
            {results.rows.map((c) => (
              <tr key={c.id} className="hover:bg-slate-900/70">
                <td className="max-w-[320px] truncate px-4 py-3">
                  <Link href={`/companies/${c.id}`} className="font-medium text-slate-200 hover:text-sky-400 hover:underline">
                    {c.name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-slate-400">
                  {[c.city, c.stateProvince, c.countryCode].filter(Boolean).join(", ") || "—"}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-slate-300">{fmtInt(c.shipmentsAsConsignee)}</td>
                <td className="px-4 py-3 text-right tabular-nums text-slate-300">{fmtInt(c.shipmentsAsShipper)}</td>
                <td className="px-4 py-3 text-right tabular-nums text-slate-300">{fmtWeight(c.totalWeightKg)}</td>
                <td className="px-4 py-3 text-right text-slate-400">{fmtDate(c.lastShipment)}</td>
              </tr>
            ))}
            {results.rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-slate-500">
                  No companies match.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <Pagination
        basePath="/companies"
        params={{ q: q || undefined, role: role !== "all" ? role : undefined }}
        page={results.page}
        pageSize={results.pageSize}
        total={results.total}
      />
    </>
  );
}
