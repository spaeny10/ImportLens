import Link from "next/link";
import { requireUser } from "../../../lib/auth";
import { getSavedSearches, getWatchlist } from "../../../lib/queries";
import { deleteSavedSearch, toggleWatch } from "../actions";
import { fmtDate, fmtInt } from "../../../lib/format";
import { Card, EmptyState, PageHeader } from "../../../components/ui";

export const metadata = { title: "Saved — ImportLens" };
export const dynamic = "force-dynamic";

const FILTER_LABELS: Record<string, string> = {
  q: "Product",
  consignee: "Consignee",
  shipper: "Shipper",
  hs: "HS",
  port: "U.S. port",
  origin: "Origin",
  from: "From",
  to: "To",
};

export default async function SavedPage() {
  const user = await requireUser();
  const [searches, watched] = await Promise.all([
    getSavedSearches(user.id),
    getWatchlist(user.id),
  ]);

  return (
    <>
      <PageHeader
        title="Saved searches & watchlist"
        subtitle="Your saved shipment queries and watched companies"
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title={`Saved searches (${searches.length})`}>
          {searches.length === 0 ? (
            <EmptyState>
              No saved searches yet. Run a search and click{" "}
              <span className="text-slate-300">“☆ Save this search”</span>.
            </EmptyState>
          ) : (
            <ul className="divide-y divide-slate-800/70">
              {searches.map((s) => {
                const params = s.params as Record<string, string>;
                const qs = new URLSearchParams(params).toString();
                return (
                  <li key={s.id} className="flex items-center gap-4 py-3 first:pt-0 last:pb-0">
                    <div className="min-w-0 flex-1">
                      <Link href={`/search?${qs}`} className="font-medium text-sky-400 hover:underline">
                        {s.name}
                      </Link>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {Object.entries(params).map(([k, v]) => (
                          <span
                            key={k}
                            className="rounded bg-slate-800 px-1.5 py-0.5 text-xs text-slate-300"
                          >
                            {FILTER_LABELS[k] ?? k}: {v}
                          </span>
                        ))}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        Saved {fmtDate(s.createdAt)}
                      </div>
                    </div>
                    <form action={deleteSavedSearch.bind(null, s.id)}>
                      <button
                        type="submit"
                        className="rounded-md border border-slate-700 px-2.5 py-1.5 text-xs text-slate-400 hover:border-red-800 hover:bg-red-950 hover:text-red-300"
                      >
                        Delete
                      </button>
                    </form>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card title={`Watched companies (${watched.length})`}>
          {watched.length === 0 ? (
            <EmptyState>
              Nothing watched yet. Open a company profile and click{" "}
              <span className="text-slate-300">“☆ Watch company”</span>.
            </EmptyState>
          ) : (
            <ul className="divide-y divide-slate-800/70">
              {watched.map((w) => (
                <li key={w.id} className="flex items-center gap-4 py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0 flex-1">
                    <Link href={`/companies/${w.companyId}`} className="font-medium text-slate-200 hover:text-sky-400 hover:underline">
                      {w.name}
                    </Link>
                    <div className="mt-1 text-xs text-slate-500">
                      {fmtInt(w.shipmentsAsConsignee)} imports · {fmtInt(w.shipmentsAsShipper)} exports
                      · last shipment {fmtDate(w.lastShipment)}
                    </div>
                  </div>
                  <form action={toggleWatch.bind(null, w.companyId)}>
                    <button
                      type="submit"
                      className="rounded-md border border-slate-700 px-2.5 py-1.5 text-xs text-slate-400 hover:bg-slate-800"
                    >
                      Unwatch
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
