import { getPortOptions, searchShipments } from "../../../lib/queries";
import { SearchFilters } from "../../../components/search-filters";
import { ShipmentsTable } from "../../../components/shipments-table";
import { Pagination } from "../../../components/pagination";
import { PageHeader } from "../../../components/ui";

export const metadata = { title: "Shipment search — ImportLens" };
export const dynamic = "force-dynamic";

type SP = { [key: string]: string | string[] | undefined };
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function SearchPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const params = {
    q: one(sp.q),
    consignee: one(sp.consignee),
    shipper: one(sp.shipper),
    hs: one(sp.hs),
    port: one(sp.port),
    origin: one(sp.origin),
    from: one(sp.from),
    to: one(sp.to),
  };
  const page = Math.max(1, parseInt(one(sp.page) ?? "1", 10) || 1);

  const [{ usPorts, foreignPorts }, results] = await Promise.all([
    getPortOptions(),
    searchShipments({ ...params, page }),
  ]);

  return (
    <>
      <PageHeader
        title="Shipment search"
        subtitle="Search U.S. import bills of lading by product, company, HS code, port, and date"
      />
      <SearchFilters defaults={params} usPorts={usPorts} foreignPorts={foreignPorts} />
      <div className="mt-4">
        <ShipmentsTable rows={results.rows} />
        <Pagination
          basePath="/search"
          params={params}
          page={results.page}
          pageSize={results.pageSize}
          total={results.total}
        />
      </div>
    </>
  );
}
