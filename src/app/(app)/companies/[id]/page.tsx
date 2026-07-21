import Link from "next/link";
import { notFound } from "next/navigation";
import { getCompanyProfile, isWatched } from "../../../../lib/queries";
import { requireUser } from "../../../../lib/auth";
import { fmtDate, fmtInt, fmtWeight } from "../../../../lib/format";
import { hsChapterName } from "../../../../lib/hs";
import { Card, PageHeader, RankedBars, StatCard } from "../../../../components/ui";
import { MonthlyVolumeChart } from "../../../../components/charts";
import { ShipmentsTable } from "../../../../components/shipments-table";
import { WatchButton } from "../../../../components/watch-button";

export const metadata = { title: "Company profile — ImportLens" };
export const dynamic = "force-dynamic";

export default async function CompanyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: idStr } = await params;
  const id = parseInt(idStr, 10);
  if (!Number.isFinite(id)) notFound();

  const user = await requireUser();
  const [profile, watched] = await Promise.all([getCompanyProfile(id), isWatched(user.id, id)]);
  if (!profile) notFound();
  const { company: c, monthly, partners, topHs, recent } = profile;

  const isImporter = c.shipmentsAsConsignee >= c.shipmentsAsShipper;
  const total = c.shipmentsAsConsignee + c.shipmentsAsShipper;

  return (
    <>
      <PageHeader
        title={c.name}
        subtitle={
          <>
            {isImporter ? "U.S. importer" : "Overseas supplier"} ·{" "}
            {[c.city, c.stateProvince, c.countryCode].filter(Boolean).join(", ") || "Location unknown"}
          </>
        }
      >
        <div className="flex gap-3">
          <WatchButton companyId={c.id} watched={watched} />
          <Link
            href={
              isImporter
                ? `/search?consignee=${encodeURIComponent(c.name)}`
                : `/search?shipper=${encodeURIComponent(c.name)}`
            }
            className="rounded-md bg-sky-500 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-400"
          >
            All shipments →
          </Link>
        </div>
      </PageHeader>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total shipments" value={fmtInt(total)} />
        <StatCard
          label="Role split"
          value={`${fmtInt(c.shipmentsAsConsignee)} / ${fmtInt(c.shipmentsAsShipper)}`}
          hint="as importer / as supplier"
        />
        <StatCard label="Gross weight" value={fmtWeight(c.totalWeightKg)} />
        <StatCard
          label="Active period"
          value={`${fmtDate(c.firstShipment)}`}
          hint={`to ${fmtDate(c.lastShipment)}`}
        />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card title="Monthly shipment volume" className="lg:col-span-2">
          <MonthlyVolumeChart data={monthly} />
        </Card>
        <Card title={isImporter ? "Top suppliers" : "Top customers (importers)"}>
          <RankedBars
            items={partners.map((p) => ({
              key: String(p.id),
              label: `${p.name}${p.country_code ? ` (${p.country_code})` : ""}`,
              value: p.shipments,
              href: `/companies/${p.id}`,
            }))}
          />
          {partners.length === 0 && (
            <p className="text-sm text-slate-500">No linked trading partners.</p>
          )}
        </Card>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card title="Top commodities (HS chapters)">
          <RankedBars
            items={topHs.map((h) => ({
              key: h.chapter,
              label: `${h.chapter} · ${hsChapterName(h.chapter)}`,
              value: h.shipments,
            }))}
          />
          {topHs.length === 0 && <p className="text-sm text-slate-500">No tariff data.</p>}
        </Card>
        <div className="lg:col-span-2">
          <h2 className="mb-3 text-sm font-semibold text-slate-200">Recent shipments</h2>
          <ShipmentsTable
            rows={recent.map((r) => ({
              ...r,
              consigneeCompanyId: null,
              shipperCompanyId: null,
              carrierCode: null,
            }))}
          />
        </div>
      </div>
    </>
  );
}
