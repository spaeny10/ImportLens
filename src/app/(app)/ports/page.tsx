import Link from "next/link";
import { getPortOptions, getPortStats } from "../../../lib/queries";
import { getFleetPositions } from "../../../lib/ais/provider";
import { fmtDate, fmtInt, fmtWeight } from "../../../lib/format";
import { Card, PageHeader, RankedBars, StatCard } from "../../../components/ui";
import { MonthlyVolumeChart } from "../../../components/charts";

export const metadata = { title: "Port arrivals — ImportLens" };
export const dynamic = "force-dynamic";

type SP = { [key: string]: string | string[] | undefined };
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function PortsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const { usPorts } = await getPortOptions();
  const port = one(sp.port) && usPorts.includes(one(sp.port)!) ? one(sp.port)! : usPorts[0];

  const [stats, positions] = await Promise.all([getPortStats(port), getFleetPositions()]);
  const inbound = positions
    .filter((p) => p.destination === port)
    .sort((a, b) => (a.etaIso ?? "9999").localeCompare(b.etaIso ?? "9999"));

  return (
    <>
      <PageHeader
        title="Port arrivals board"
        subtitle="Vessels inbound to a U.S. port, with the port's manifest activity"
      />

      <div className="mb-4 flex flex-wrap gap-1.5">
        {usPorts.map((p) => (
          <Link
            key={p}
            href={`/ports?port=${encodeURIComponent(p)}`}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${
              p === port
                ? "bg-sky-500 text-white"
                : "border border-slate-700 text-slate-300 hover:bg-slate-800"
            }`}
          >
            {p.split(",")[0]}
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Inbound vessels now" value={fmtInt(inbound.length)} />
        <StatCard label="Shipments (last 60 days)" value={fmtInt(stats.totals.recent_shipments)} />
        <StatCard label="All-time shipments" value={fmtInt(stats.totals.shipments)} />
        <StatCard label="Gross weight" value={fmtWeight(stats.totals.weight_kg)} />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card title={`Inbound to ${port.split(",")[0]}`} className="lg:col-span-2">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="pb-2 font-medium">Vessel</th>
                  <th className="pb-2 font-medium">Carrier</th>
                  <th className="pb-2 font-medium">Speed</th>
                  <th className="pb-2 font-medium">ETA</th>
                  <th className="pb-2 text-right font-medium">BOLs in dataset</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {inbound.map((v) => (
                  <tr key={v.name}>
                    <td className="py-2">
                      <Link
                        href={`/vessels/${encodeURIComponent(v.name)}`}
                        className="font-medium text-sky-400 hover:underline"
                      >
                        {v.name}
                      </Link>
                      {v.source === "ais" && (
                        <span className="ml-2 rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-400">
                          LIVE
                        </span>
                      )}
                    </td>
                    <td className="py-2 text-slate-300">{v.carrierCode ?? "—"}</td>
                    <td className="py-2 text-slate-300">
                      {v.sogKnots > 0.5 ? `${v.sogKnots} kn` : "Docked"}
                    </td>
                    <td className="py-2 text-slate-300">
                      {v.etaIso ? fmtDate(v.etaIso.slice(0, 10)) : "Arrived"}
                    </td>
                    <td className="py-2 text-right tabular-nums text-slate-300">
                      {fmtInt(v.shipmentCount)}
                    </td>
                  </tr>
                ))}
                {inbound.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-slate-500">
                      No tracked vessels currently bound for this port.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
        <Card title="Top consignees at this port">
          <RankedBars
            items={stats.topConsignees.map((c) => ({
              key: String(c.id),
              label: c.name,
              value: c.shipments,
              href: `/companies/${c.id}`,
            }))}
          />
        </Card>
      </div>

      <div className="mt-4">
        <Card title={`Monthly shipment volume — ${port.split(",")[0]}`}>
          <MonthlyVolumeChart data={stats.monthly} height={220} />
        </Card>
      </div>
    </>
  );
}
