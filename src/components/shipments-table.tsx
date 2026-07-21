import Link from "next/link";
import type { ShipmentRow } from "../lib/queries";
import { fmtDate, fmtInt, fmtWeight } from "../lib/format";

export function ShipmentsTable({ rows }: { rows: ShipmentRow[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-800">
      <table className="w-full min-w-[900px] text-sm">
        <thead>
          <tr className="border-b border-slate-800 bg-slate-900 text-left text-xs uppercase tracking-wide text-slate-400">
            <th className="px-4 py-3 font-medium">Arrival</th>
            <th className="px-4 py-3 font-medium">Consignee (importer)</th>
            <th className="px-4 py-3 font-medium">Shipper (supplier)</th>
            <th className="px-4 py-3 font-medium">Route</th>
            <th className="px-4 py-3 font-medium">Product</th>
            <th className="px-4 py-3 text-right font-medium">Weight</th>
            <th className="px-4 py-3 text-right font-medium">Cntrs</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/70 bg-slate-950/40">
          {rows.map((r) => (
            <tr key={r.id} className="hover:bg-slate-900/70">
              <td className="whitespace-nowrap px-4 py-3 text-slate-300">
                <Link href={`/shipments/${r.id}`} className="text-sky-400 hover:underline">
                  {fmtDate(r.arrivalDate)}
                </Link>
              </td>
              <td className="max-w-[220px] truncate px-4 py-3">
                {r.consigneeCompanyId ? (
                  <Link href={`/companies/${r.consigneeCompanyId}`} className="text-slate-200 hover:text-sky-400 hover:underline">
                    {r.consigneeName}
                  </Link>
                ) : (
                  <span className="text-slate-400">{r.consigneeName ?? "—"}</span>
                )}
              </td>
              <td className="max-w-[220px] truncate px-4 py-3">
                {r.shipperCompanyId ? (
                  <Link href={`/companies/${r.shipperCompanyId}`} className="text-slate-200 hover:text-sky-400 hover:underline">
                    {r.shipperName}
                  </Link>
                ) : (
                  <span className="text-slate-400">{r.shipperName ?? "—"}</span>
                )}
              </td>
              <td className="max-w-[210px] px-4 py-3 text-xs text-slate-400">
                <div className="truncate">{r.foreignPortOfLading ?? "—"}</div>
                <div className="truncate text-slate-500">→ {r.portOfUnlading ?? "—"}</div>
              </td>
              <td className="max-w-[260px] truncate px-4 py-3 text-slate-300">
                {r.descriptionSummary ?? "—"}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-slate-300">
                {fmtWeight(r.weightKg)}
              </td>
              <td className="px-4 py-3 text-right tabular-nums text-slate-300">
                {fmtInt(r.containerCount)}
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={7} className="px-4 py-10 text-center text-slate-500">
                No shipments match these filters.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
