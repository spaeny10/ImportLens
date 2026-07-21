import Link from "next/link";
import { getDashboardStats } from "../../lib/queries";
import { fmtDate, fmtInt, fmtWeight } from "../../lib/format";
import { hsChapterName } from "../../lib/hs";
import { Card, PageHeader, RankedBars, StatCard } from "../../components/ui";
import { MonthlyVolumeChart } from "../../components/charts";

export const metadata = { title: "Dashboard — ImportLens" };
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const stats = await getDashboardStats();

  return (
    <>
      <PageHeader
        title="U.S. import activity"
        subtitle={`Bill-of-lading records from ${fmtDate(stats.totals.first_date)} to ${fmtDate(stats.totals.last_date)}`}
      >
        <Link
          href="/search"
          className="rounded-md bg-sky-500 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-400"
        >
          Search shipments →
        </Link>
      </PageHeader>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Shipments (BOLs)" value={fmtInt(stats.totals.shipments)} />
        <StatCard label="Companies tracked" value={fmtInt(stats.totals.companies)} />
        <StatCard label="Containers" value={fmtInt(stats.totals.containers)} />
        <StatCard label="Gross weight" value={fmtWeight(stats.totals.weight_kg)} />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card title="Monthly shipment volume" className="lg:col-span-2">
          <MonthlyVolumeChart data={stats.monthly} />
        </Card>
        <Card title="Top U.S. ports of unlading">
          <RankedBars
            items={stats.topPorts.slice(0, 8).map((p) => ({
              key: p.name,
              label: p.name,
              value: p.shipments,
              href: `/search?port=${encodeURIComponent(p.name)}`,
            }))}
          />
        </Card>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card title="Top importers (consignees)">
          <RankedBars
            items={stats.topImporters.map((c) => ({
              key: String(c.id),
              label: c.name,
              value: c.shipments,
              href: `/companies/${c.id}`,
            }))}
          />
        </Card>
        <Card title="Top suppliers (shippers)">
          <RankedBars
            items={stats.topSuppliers.map((c) => ({
              key: String(c.id),
              label: `${c.name}${c.country_code ? ` (${c.country_code})` : ""}`,
              value: c.shipments,
              href: `/companies/${c.id}`,
            }))}
          />
        </Card>
        <Card title="Top commodity chapters">
          <RankedBars
            items={stats.topChapters.map((h) => ({
              key: h.chapter,
              label: `${h.chapter} · ${hsChapterName(h.chapter)}`,
              value: h.shipments,
              href: `/search?hs=${h.chapter}`,
            }))}
          />
        </Card>
      </div>
    </>
  );
}
