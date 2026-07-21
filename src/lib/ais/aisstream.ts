import type { VesselPosition } from "./types";

// Live AIS via aisstream.io — enabled when AISSTREAM_API_KEY is set.
// One websocket per server process, subscribed worldwide; PositionReports are
// matched to our fleet by ship name (AISStream includes ShipName in MetaData),
// and matched positions overlay the simulator's output while fresh.

const FRESH_MS = 30 * 60 * 1000;
const RECONNECT_MS = 15_000;

export interface LiveFix {
  mmsi: string;
  lat: number;
  lon: number;
  sogKnots: number;
  cogDeg: number;
  destination: string | null;
  atMs: number;
}

type AisGlobal = typeof globalThis & {
  __aisCache?: Map<string, LiveFix>; // key: normalized ship name
  __aisStarted?: boolean;
  __aisFleet?: Set<string>;
};

const g = globalThis as AisGlobal;

function normName(s: string): string {
  return s.trim().toUpperCase().replace(/\s+/g, " ");
}

export function ensureAisStream(fleetNames: string[]): void {
  const key = process.env.AISSTREAM_API_KEY;
  if (!key) return;
  g.__aisCache ??= new Map();
  g.__aisFleet = new Set(fleetNames.map(normName));
  if (g.__aisStarted) return;
  g.__aisStarted = true;
  connect(key);
}

function connect(key: string): void {
  let ws: WebSocket;
  try {
    ws = new WebSocket("wss://stream.aisstream.io/v0/stream");
  } catch (e) {
    console.error("[ais] websocket create failed:", e);
    setTimeout(() => connect(key), RECONNECT_MS);
    return;
  }

  ws.onopen = () => {
    ws.send(
      JSON.stringify({
        APIKey: key,
        BoundingBoxes: [[[-90, -180], [90, 180]]],
        FilterMessageTypes: ["PositionReport"],
      })
    );
    console.log("[ais] connected to aisstream.io");
  };

  ws.onmessage = (ev) => {
    try {
      const msg = JSON.parse(typeof ev.data === "string" ? ev.data : "");
      const meta = msg?.MetaData;
      const report = msg?.Message?.PositionReport;
      if (!meta?.ShipName || !report) return;
      const name = normName(String(meta.ShipName));
      if (!g.__aisFleet?.has(name)) return;
      g.__aisCache!.set(name, {
        mmsi: String(meta.MMSI ?? ""),
        lat: report.Latitude,
        lon: report.Longitude,
        sogKnots: typeof report.Sog === "number" ? report.Sog : 0,
        cogDeg: typeof report.Cog === "number" ? Math.round(report.Cog) : 0,
        destination: null, // only present in ShipStaticData; sim value is kept
        atMs: Date.now(),
      });
    } catch {
      // malformed frame — ignore
    }
  };

  ws.onclose = () => {
    console.warn("[ais] stream closed, reconnecting shortly");
    setTimeout(() => connect(key), RECONNECT_MS);
  };
  ws.onerror = () => {
    try {
      ws.close();
    } catch {
      /* already closed */
    }
  };
}

export function applyLiveFix(base: VesselPosition): VesselPosition {
  const fix = g.__aisCache?.get(normName(base.name));
  if (!fix || Date.now() - fix.atMs > FRESH_MS) return base;
  return {
    ...base,
    mmsi: fix.mmsi,
    lat: fix.lat,
    lon: fix.lon,
    sogKnots: fix.sogKnots,
    cogDeg: fix.cogDeg,
    lastSeenIso: new Date(fix.atMs).toISOString(),
    source: "ais",
  };
}
