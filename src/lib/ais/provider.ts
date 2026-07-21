import { sql } from "drizzle-orm";
import { getDb } from "../../db";
import type { VesselPosition } from "./types";
import { simulatePosition } from "./sim";
import { applyLiveFix, ensureAisStream } from "./aisstream";

// Fleet roster = every vessel named in the manifest data, with its dominant
// ports (used to assign a plausible simulated trade route).
interface FleetRow {
  name: string;
  carrierCode: string | null;
  shipmentCount: number;
  topUsPort: string | null;
  topForeignPort: string | null;
}

type FleetGlobal = typeof globalThis & {
  __fleetCache?: { rows: FleetRow[]; atMs: number };
};

const FLEET_TTL_MS = 5 * 60 * 1000;

async function getFleet(): Promise<FleetRow[]> {
  const g = globalThis as FleetGlobal;
  if (g.__fleetCache && Date.now() - g.__fleetCache.atMs < FLEET_TTL_MS) {
    return g.__fleetCache.rows;
  }
  const db = await getDb();
  const res = await db.execute(sql`
    SELECT vessel_name AS name,
           mode() WITHIN GROUP (ORDER BY carrier_code) AS carrier_code,
           count(*)::int AS shipment_count,
           mode() WITHIN GROUP (ORDER BY port_of_unlading) AS top_us_port,
           mode() WITHIN GROUP (ORDER BY foreign_port_of_lading) AS top_foreign_port
    FROM shipments
    WHERE vessel_name IS NOT NULL
    GROUP BY vessel_name
    ORDER BY shipment_count DESC
  `);
  const rows = (res.rows as Record<string, unknown>[]).map((r) => ({
    name: String(r.name),
    carrierCode: (r.carrier_code as string) ?? null,
    shipmentCount: Number(r.shipment_count),
    topUsPort: (r.top_us_port as string) ?? null,
    topForeignPort: (r.top_foreign_port as string) ?? null,
  }));
  g.__fleetCache = { rows, atMs: Date.now() };
  return rows;
}

export async function getFleetPositions(): Promise<VesselPosition[]> {
  const fleet = await getFleet();
  ensureAisStream(fleet.map((v) => v.name));
  const now = Date.now();
  return fleet.map((v) => applyLiveFix(simulatePosition(v, now)));
}

export async function getVesselPosition(name: string): Promise<VesselPosition | null> {
  const positions = await getFleetPositions();
  const target = name.trim().toUpperCase();
  return positions.find((p) => p.name.toUpperCase() === target) ?? null;
}
