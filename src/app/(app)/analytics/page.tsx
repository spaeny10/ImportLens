import { getDashboardStats } from "../../../lib/queries";
import { fmtInt } from "../../../lib/format";
import { hsChapterName } from "../../../lib/hs";
import { Card, PageHeader, RankedBars } from "../../../components/ui";
import { MonthlyVolumeChart, MonthlyWeightChart } from "../../../components/charts";

export const metadata = { title: "Analytics — ImportLens" };
export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const stats = await getDashboardStats();
  const last12 = stats.monthly.slice(-12);
  const prev = stats.monthly.slice(-24, -12);
  const growth =
    prev.length > 0
      ? ((last12.reduce((a, m) => a + m.shipments, 0) -
          prev.reduce((a, m) => a + m.shipments, 0)) /
          Math.max(1, prev.reduce((a, m) => a + m.shipments, 0))) *
        100
      : null;

  return (
    <>
      <PageHeader
        title="Trade analytics"
        subtitle={
          growth != null ? (
            <>
              Trailing 12-month volume {fmtInt(last12.reduce((a, m) => a + m.shipments, 0))} shipments —{" "}
              <span className={growth >= 0 ? "text-emerald-400" : "text-red-400"}>
                {growth >= 0 ? "▲" : "▼"} {Math.abs(growth).toFixed(1)}%
              </span>{" "}
              vs. prior period
            </>
          ) : undefined
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title="Shipments per month">
          <MonthlyVolumeChart data={stats.monthly} height={240} />
        </Card>
        <Card title="Gross weight per month">
          <MonthlyWeightChart data={stats.monthly} height={240} />
        </Card>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title="U.S. ports of unlading — shipment share">
          <RankedBars
            items={stats.topPorts.map((p) => ({
              key: p.name,
              label: p.name,
              value: p.shipments,
              href: `/search?port=${encodeURIComponent(p.name)}`,
            }))}
          />
        </Card>
        <Card title="Foreign ports of lading — shipment share">
          <RankedBars
            items={stats.topOrigins.map((p) => ({
              key: p.name,
              label: p.name,
              value: p.shipments,
              href: `/search?origin=${encodeURIComponent(p.name)}`,
            }))}
          />
        </Card>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card title="Commodity mix (HS chapters)" className="lg:col-span-1">
          <RankedBars
            items={stats.topChapters.map((h) => ({
              key: h.chapter,
              label: `${h.chapter} · ${hsChapterName(h.chapter)}`,
              value: h.shipments,
              href: `/search?hs=${h.chapter}`,
            }))}
          />
        </Card>
        <Card title="Top importers by shipment count">
          <RankedBars
            items={stats.topImporters.map((c) => ({
              key: String(c.id),
              label: c.name,
              value: c.shipments,
              href: `/companies/${c.id}`,
            }))}
          />
        </Card>
        <Card title="Top suppliers by shipment count">
          <RankedBars
            items={stats.topSuppliers.map((c) => ({
              key: String(c.id),
              label: `${c.name}${c.country_code ? ` (${c.country_code})` : ""}`,
              value: c.shipments,
              href: `/companies/${c.id}`,
            }))}
          />
        </Card>
      </div>
    </>
  );
}
