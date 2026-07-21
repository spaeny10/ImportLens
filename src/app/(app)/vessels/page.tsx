import { PageHeader } from "../../../components/ui";
import { FleetMapPanel } from "../../../components/vessel-map";

export const metadata = { title: "Vessel tracker — ImportLens" };
export const dynamic = "force-dynamic";

export default function VesselsPage() {
  return (
    <>
      <PageHeader
        title="Vessel tracker"
        subtitle={
          <>
            Live positions of the container fleet in your manifest data.{" "}
            {!process.env.AISSTREAM_API_KEY && (
              <span className="text-slate-500">
                Positions are simulated along real trade lanes — set AISSTREAM_API_KEY for live AIS.
              </span>
            )}
          </>
        }
      />
      <FleetMapPanel />
    </>
  );
}
