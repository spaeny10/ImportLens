import Link from "next/link";
import { getBiAnalytics, getPortOptions } from "../../../lib/queries";
import { fmtDate, fmtInt, fmtWeight } from "../../../lib/format";
import { hsChapterName } from "../../../lib/hs";
import { Card, PageHeader, RankedBars } from "../../../components/ui";
import { MonthlyVolumeChart, MonthlyWeightChart } from "../../../components/charts";
import { CarrierDonut, ChapterBars, MiniDonut } from "../../../components/bi-charts";

export const metadata = { title: "Analytics — ImportLens" };
export const dynamic = "force-dynamic";

type SP = { [key: string]: string | string[] | undefined };
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

const RANGES: { id: string; label: string; days?: number }[] = [
  { id: "all", label: "All time" },
  { id: "90d", label: "Last 90 days", days: 90 },
  { id: "180d", label: "Last 6 months", days: 180 },
  { id: "365d", label: "Last 12 months", days: 365 },
];

const CARRIER_NAMES: Record<string, string> = {
  MAEU: "Maersk",
  MSCU: "MSC",
  CMDU: "CMA CGM",
  EGLV: "Evergreen",
  COSU: "COSCO",
  OOLU: "OOCL",
  HLCU: "Hapag-Lloyd",
  ONEY: "ONE",
  HDMU: "HMM",
  YMLU: "Yang Ming",
};

function Kpi({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="px-5 py-4">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</div>
      <div className="mt-1 text-2xl font-bold text-sky-400">{value}</div>
      {hint && <div className="mt-0.5 text-xs text-slate-500">{hint}</div>}
    </div>
  );
}

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const rangeId = RANGES.some((r) => r.id === one(sp.range)) ? one(sp.range)! : "all";
  const range = RANGES.find((r) => r.id === rangeId)!;
  const { usPorts } = await getPortOptions();
  const port = one(sp.port) && usPorts.includes(one(sp.port)!) ? one(sp.port)! : undefined;

  const data = await getBiAnalytics({ port, rangeDays: range.days });

  // Donut: top 6 carriers + Other (categorical slots are never cycled past 6)
  const carrierTotal = data.byCarrier.reduce((a, c) => a + c.shipments, 0);
  const topCarriers = data.byCarrier.slice(0, 6).map((c) => ({
    name: CARRIER_NAMES[c.carrier] ?? c.carrier,
    value: c.shipments,
  }));
  const otherCount = data.byCarrier.slice(6).reduce((a, c) => a + c.shipments, 0);
  const donutData = otherCount > 0
    ? [...topCarriers, { name: "Other carriers", value: otherCount, isOther: true }]
    : topCarriers;

  // Heatmap matrix: ports × chapters with totals
  const heatChapters = [...new Set(data.heatmap.map((h) => h.chapter))].sort(
    (a, b) =>
      data.heatmap.filter((h) => h.chapter === b).reduce((s, h) => s + h.shipments, 0) -
      data.heatmap.filter((h) => h.chapter === a).reduce((s, h) => s + h.shipments, 0)
  );
  const heatPorts = [...new Set(data.heatmap.map((h) => h.port))].sort(
    (a, b) =>
      data.heatmap.filter((h) => h.port === b).reduce((s, h) => s + h.shipments, 0) -
      data.heatmap.filter((h) => h.port === a).reduce((s, h) => s + h.shipments, 0)
  );
  const heatValue = (p: string, c: string) =>
    data.heatmap.find((h) => h.port === p && h.chapter === c)?.shipments ?? 0;
  const heatMax = Math.max(1, ...data.heatmap.map((h) => h.shipments));

  const avgWeight = data.kpis.shipments > 0 ? Math.round(data.kpis.weight_kg / data.kpis.shipments) : 0;
  const portShareTotal = data.kpis.shipments;

  return (
    <>
      <PageHeader
        title="Trade analytics"
        subtitle={
          <>
            {range.label}
            {port ? ` · ${port}` : " · all U.S. ports"} · data through {fmtDate(data.maxDate)}
          </>
        }
      />

      {/* Filter bar */}
      <form method="GET" action="/analytics" className="mb-4 flex flex-wrap items-end gap-3 rounded-xl border border-slate-800 bg-slate-900 p-4">
        <div>
          <label htmlFor="range" className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">
            Date range
          </label>
          <select
            id="range"
            name="range"
            defaultValue={rangeId}
            className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-sky-500 focus:outline-none"
          >
            {RANGES.map((r) => (
              <option key={r.id} value={r.id}>{r.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="port" className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">
            U.S. port of unlading
          </label>
          <select
            id="port"
            name="port"
            defaultValue={port ?? ""}
            className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-sky-500 focus:outline-none"
          >
            <option value="">All ports</option>
            {usPorts.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
        <button type="submit" className="rounded-md bg-sky-500 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-400">
          Apply
        </button>
        {(port || rangeId !== "all") && (
          <Link href="/analytics" className="text-sm text-slate-400 hover:text-slate-200">
            Reset
          </Link>
        )}
      </form>

      {/* KPI band */}
      <div className="grid grid-cols-2 divide-y divide-slate-800 rounded-xl border border-slate-800 bg-slate-900 sm:grid-cols-3 lg:grid-cols-5 lg:divide-x lg:divide-y-0">
        <Kpi label="Shipments (BOLs)" value={fmtInt(data.kpis.shipments)} />
        <Kpi label="Containers" value={fmtInt(data.kpis.containers)} />
        <Kpi label="Gross weight" value={fmtWeight(data.kpis.weight_kg)} />
        <Kpi label="Avg weight / BOL" value={fmtWeight(avgWeight)} />
        <Kpi label="Active importers" value={fmtInt(data.kpis.importers)} hint={`${fmtInt(data.kpis.vessels)} vessels`} />
      </div>

      {/* Donut · histogram · heatmap */}
      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card title="Carrier market share">
          <CarrierDonut data={donutData} total={carrierTotal} />
        </Card>
        <Card title="Shipments by HS chapter">
          <ChapterBars
            data={data.byChapter.map((c) => ({
              chapter: c.chapter,
              label: `${c.chapter} · ${hsChapterName(c.chapter)}`,
              shipments: c.shipments,
            }))}
          />
        </Card>
        <Card title="Port × commodity heatmap">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr>
                  <th className="pb-2 pr-2 text-left font-medium text-slate-500">Port</th>
                  {heatChapters.map((c) => (
                    <th key={c} className="pb-2 text-center font-medium text-slate-500" title={hsChapterName(c)}>
                      {c}
                    </th>
                  ))}
                  <th className="pb-2 pl-2 text-right font-medium text-slate-500">Total</th>
                </tr>
              </thead>
              <tbody>
                {heatPorts.map((p) => (
                  <tr key={p}>
                    <td className="max-w-[110px] truncate py-0.5 pr-2 text-slate-300" title={p}>
                      {p.split(",")[0]}
                    </td>
                    {heatChapters.map((c) => {
                      const v = heatValue(p, c);
                      const pct = 8 + (v / heatMax) * 70;
                      return (
                        <td
                          key={c}
                          className="px-0.5 py-0.5 text-center tabular-nums"
                          title={`${p.split(",")[0]} · ${hsChapterName(c)}: ${fmtInt(v)}`}
                        >
                          <div
                            className="rounded px-1 py-1 text-slate-200"
                            style={{
                              backgroundColor:
                                v > 0
                                  ? `color-mix(in srgb, var(--viz-series) ${pct.toFixed(0)}%, transparent)`
                                  : undefined,
                            }}
                          >
                            {v > 0 ? fmtInt(v) : "·"}
                          </div>
                        </td>
                      );
                    })}
                    <td className="py-0.5 pl-2 text-right font-semibold tabular-nums text-slate-300">
                      {fmtInt(heatChapters.reduce((s, c) => s + heatValue(p, c), 0))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-[11px] text-slate-500">
            Columns are HS chapters (hover for names); cell shade scales with shipment count.
          </p>
        </Card>
      </div>

      {/* Importer bars · per-port donuts */}
      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card title="Top importers">
          <RankedBars
            items={data.topImporters.map((c) => ({
              key: String(c.id),
              label: c.name,
              value: c.shipments,
              href: `/companies/${c.id}`,
            }))}
          />
        </Card>
        <Card title="Port share of shipments" className="xl:col-span-2">
          <div className="flex flex-wrap items-start justify-around gap-2">
            {data.portShares.map((p) => (
              <MiniDonut
                key={p.port}
                label={p.port.split(",")[0]}
                value={p.shipments}
                total={portShareTotal}
              />
            ))}
          </div>
        </Card>
      </div>

      {/* Trends */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title="Shipments per month">
          <MonthlyVolumeChart data={data.monthly} height={220} />
        </Card>
        <Card title="Gross weight per month">
          <MonthlyWeightChart data={data.monthly} height={220} />
        </Card>
      </div>
    </>
  );
}
