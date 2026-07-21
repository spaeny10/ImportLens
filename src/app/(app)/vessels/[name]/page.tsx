import Link from "next/link";
import { notFound } from "next/navigation";
import { getVesselStats } from "../../../../lib/queries";
import { getVesselPosition } from "../../../../lib/ais/provider";
import { fmtDate, fmtInt, fmtWeight } from "../../../../lib/format";
import { Card, PageHeader, RankedBars, StatCard } from "../../../../components/ui";
import { SingleVesselMap } from "../../../../components/vessel-map";
import { ShipmentsTable } from "../../../../components/shipments-table";

export const metadata = { title: "Vessel — ImportLens" };
export const dynamic = "force-dynamic";

export default async function VesselPage({ params }: { params: Promise<{ name: string }> }) {
  const { name: raw } = await params;
  const name = decodeURIComponent(raw);
  const [stats, position] = await Promise.all([getVesselStats(name), getVesselPosition(name)]);
  if (!stats) notFound();

  return (
    <>
      <PageHeader
        title={name}
        subtitle={
          <>
            Container vessel{stats.totals.carrier_code && <> · operated by {stats.totals.carrier_code}</>}
            {position?.source === "ais" ? (
              <span className="ml-2 rounded bg-emerald-500/10 px-1.5 py-0.5 text-xs font-semibold text-emerald-400">
                LIVE AIS
              </span>
            ) : (
              <span className="ml-2 text-xs text-slate-500">simulated position</span>
            )}
          </>
        }
      >
        <Link
          href={`/search?vessel=${encodeURIComponent(name)}`}
          className="rounded-md bg-sky-500 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-400"
        >
          All shipments →
        </Link>
      </PageHeader>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Status"
          value={position ? (position.sogKnots > 0.5 ? `${position.sogKnots} kn` : "In port") : "—"}
          hint={position && position.sogKnots > 0.5 ? `course ${position.cogDeg}°` : undefined}
        />
        <StatCard
          label="Destination"
          value={position?.destination ?? "—"}
          hint={position?.etaIso ? `ETA ${fmtDate(position.etaIso.slice(0, 10))}` : undefined}
        />
        <StatCard label="BOLs in dataset" value={fmtInt(stats.totals.shipments)} />
        <StatCard
          label="Cargo carried"
          value={fmtWeight(stats.totals.weight_kg)}
          hint={`${fmtInt(stats.totals.containers)} containers · last arrival ${fmtDate(stats.totals.last_arrival)}`}
        />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <SingleVesselMap name={name} />
        </div>
        <Card title="Top routes (from manifests)">
          <RankedBars
            items={stats.routes.map((r, i) => ({
              key: String(i),
              label: `${(r.origin ?? "—").split(",")[0]} → ${(r.destination ?? "—").split(",")[0]}`,
              value: r.shipments,
            }))}
          />
        </Card>
      </div>

      <div className="mt-4">
        <h2 className="mb-3 text-sm font-semibold text-slate-200">Recent shipments on this vessel</h2>
        <ShipmentsTable rows={stats.recent} />
      </div>
    </>
  );
}
