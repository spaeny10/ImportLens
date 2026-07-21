import Link from "next/link";
import { notFound } from "next/navigation";
import { getShipment } from "../../../../lib/queries";
import { fmtDate, fmtInt, fmtWeight } from "../../../../lib/format";
import { Card, PageHeader } from "../../../../components/ui";

export const metadata = { title: "Bill of lading — ImportLens" };
export const dynamic = "force-dynamic";

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-0.5 text-sm text-slate-200">{value ?? "—"}</dd>
    </div>
  );
}

export default async function ShipmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getShipment(id);
  if (!data) notFound();
  const { shipment: s, parties, cargo, containers, tariffs } = data;

  const partyCard = (role: string, title: string) => {
    const p = parties.find((x) => x.role === role);
    if (!p) return null;
    return (
      <Card title={title} key={role}>
        <div className="text-sm">
          {p.companyId ? (
            <Link href={`/companies/${p.companyId}`} className="font-semibold text-sky-400 hover:underline">
              {p.name}
            </Link>
          ) : (
            <span className="font-semibold text-slate-200">{p.name}</span>
          )}
          <div className="mt-1 text-slate-400">
            {[p.address, p.city, p.stateProvince, p.zipCode, p.countryCode]
              .filter(Boolean)
              .join(", ") || "No address on manifest"}
          </div>
        </div>
      </Card>
    );
  };

  return (
    <>
      <PageHeader
        title={`Bill of lading ${s.masterBolNumber ?? s.id}`}
        subtitle={
          <>
            Arrived {fmtDate(s.arrivalDate)} · {s.foreignPortOfLading ?? "—"} →{" "}
            {s.portOfUnlading ?? "—"}
          </>
        }
      >
        <Link href="/search" className="text-sm text-sky-400 hover:underline">
          ← Back to search
        </Link>
      </PageHeader>

      <Card title="Voyage & manifest">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3 lg:grid-cols-4">
          <Field label="AMS identifier" value={s.id} />
          <Field label="Master BOL" value={s.masterBolNumber} />
          <Field label="House BOL" value={s.houseBolNumber} />
          <Field label="Bill type" value={s.billTypeCode} />
          <Field label="Carrier (SCAC)" value={s.carrierCode} />
          <Field label="Vessel" value={`${s.vesselName ?? "—"}${s.vesselCountryCode ? ` (${s.vesselCountryCode})` : ""}`} />
          <Field label="Voyage" value={s.voyageNumber} />
          <Field label="Place of receipt" value={s.placeOfReceipt} />
          <Field label="Foreign port of lading" value={s.foreignPortOfLading} />
          <Field label="U.S. port of unlading" value={s.portOfUnlading} />
          <Field label="Estimated arrival" value={fmtDate(s.estimatedArrivalDate)} />
          <Field label="Actual arrival" value={fmtDate(s.actualArrivalDate)} />
          <Field label="Manifest quantity" value={s.manifestQuantity != null ? `${fmtInt(s.manifestQuantity)} ${s.manifestUnit ?? ""}` : null} />
          <Field label="Gross weight" value={fmtWeight(s.weightKg)} />
          <Field label="Containers" value={fmtInt(s.containerCount)} />
        </dl>
      </Card>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        {partyCard("consignee", "Consignee (importer)")}
        {partyCard("shipper", "Shipper (supplier)")}
        {partyCard("notify", "Notify party")}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title="Cargo descriptions">
          <ul className="space-y-3">
            {cargo.map((c) => (
              <li key={c.id} className="text-sm">
                <span className="text-slate-200">{c.description}</span>
                <div className="mt-0.5 text-xs text-slate-500">
                  {c.containerNumber && <span className="font-mono">{c.containerNumber}</span>}
                  {c.pieceCount != null && <span> · {fmtInt(c.pieceCount)} pieces</span>}
                </div>
              </li>
            ))}
            {cargo.length === 0 && <li className="text-sm text-slate-500">No cargo descriptions.</li>}
          </ul>
        </Card>

        <Card title="Tariff (HTS) lines">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="pb-2 font-medium">HS code</th>
                <th className="pb-2 font-medium">Container</th>
                <th className="pb-2 text-right font-medium">Value (USD)</th>
                <th className="pb-2 text-right font-medium">Weight</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {tariffs.map((t) => (
                <tr key={t.id}>
                  <td className="py-2">
                    <Link href={`/search?hs=${t.hsNumber}`} className="font-mono text-sky-400 hover:underline">
                      {t.hsNumber}
                    </Link>
                  </td>
                  <td className="py-2 font-mono text-xs text-slate-400">{t.containerNumber ?? "—"}</td>
                  <td className="py-2 text-right tabular-nums text-slate-300">
                    {t.value != null ? `$${fmtInt(t.value)}` : "—"}
                  </td>
                  <td className="py-2 text-right tabular-nums text-slate-300">{fmtWeight(t.weightKg)}</td>
                </tr>
              ))}
              {tariffs.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-3 text-slate-500">No tariff lines on manifest.</td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>
      </div>

      <div className="mt-4">
        <Card title={`Containers (${containers.length})`}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="pb-2 font-medium">Container #</th>
                  <th className="pb-2 font-medium">Type</th>
                  <th className="pb-2 font-medium">Seal</th>
                  <th className="pb-2 font-medium">Load status</th>
                  <th className="pb-2 font-medium">Service</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {containers.map((c) => (
                  <tr key={c.id}>
                    <td className="py-2 font-mono text-slate-200">{c.containerNumber}</td>
                    <td className="py-2 text-slate-300">{c.containerType ?? c.equipmentDescription ?? "—"}</td>
                    <td className="py-2 font-mono text-xs text-slate-400">{c.sealNumber ?? "—"}</td>
                    <td className="py-2 text-slate-300">{c.loadStatus ?? "—"}</td>
                    <td className="py-2 text-slate-300">{c.typeOfService ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </>
  );
}
