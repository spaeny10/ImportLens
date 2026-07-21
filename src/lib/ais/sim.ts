import { TRADE_ROUTES, type TradeRoute, type Waypoint } from "./routes";
import type { FleetVessel, VesselPosition } from "./types";

// Deterministic vessel-position simulator. Each vessel is assigned a trade
// route (preferring one that matches its manifest ports) and shuttles between
// the foreign port and the U.S. port forever, with dwell time at each berth.
// Position is a pure function of the wall clock — no state, no workers — so
// every request (and every replica) computes the same moving world.

const DWELL_HOURS = 30;

const EARTH_NM = 3440.065;
const rad = (d: number) => (d * Math.PI) / 180;
const deg = (r: number) => (r * 180) / Math.PI;

function haversineNm(a: Waypoint, b: Waypoint): number {
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_NM * Math.asin(Math.sqrt(h));
}

function bearingDeg(a: Waypoint, b: Waypoint): number {
  const y = Math.sin(rad(b.lon - a.lon)) * Math.cos(rad(b.lat));
  const x =
    Math.cos(rad(a.lat)) * Math.sin(rad(b.lat)) -
    Math.sin(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.cos(rad(b.lon - a.lon));
  return (deg(Math.atan2(y, x)) + 360) % 360;
}

function normalizeLon(lon: number): number {
  let l = lon;
  while (l > 180) l -= 360;
  while (l < -180) l += 360;
  return l;
}

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

interface RouteGeometry {
  route: TradeRoute;
  cumNm: number[]; // cumulative distance at each waypoint
  totalNm: number;
}

const geomCache = new Map<TradeRoute, RouteGeometry>();
function geometry(route: TradeRoute): RouteGeometry {
  let g = geomCache.get(route);
  if (!g) {
    const cumNm = [0];
    for (let i = 1; i < route.waypoints.length; i++) {
      cumNm.push(cumNm[i - 1] + haversineNm(route.waypoints[i - 1], route.waypoints[i]));
    }
    g = { route, cumNm, totalNm: cumNm[cumNm.length - 1] };
    geomCache.set(route, g);
  }
  return g;
}

function pointAlong(g: RouteGeometry, distNm: number): { pos: Waypoint; cog: number } {
  const { waypoints } = g.route;
  const d = Math.min(Math.max(distNm, 0), g.totalNm);
  let i = 1;
  while (i < g.cumNm.length - 1 && g.cumNm[i] < d) i++;
  const segStart = waypoints[i - 1];
  const segEnd = waypoints[i];
  const segLen = g.cumNm[i] - g.cumNm[i - 1];
  const f = segLen > 0 ? (d - g.cumNm[i - 1]) / segLen : 0;
  return {
    pos: {
      lon: segStart.lon + (segEnd.lon - segStart.lon) * f,
      lat: segStart.lat + (segEnd.lat - segStart.lat) * f,
    },
    cog: bearingDeg(segStart, segEnd),
  };
}

// Pick the route that best matches the vessel's manifest ports.
export function assignRoute(
  vesselName: string,
  topForeignPort: string | null,
  topUsPort: string | null
): TradeRoute {
  const h = hashString(vesselName);
  let best = TRADE_ROUTES[h % TRADE_ROUTES.length];
  let bestScore = -1;
  for (const r of TRADE_ROUTES) {
    let score = 0;
    if (topUsPort && r.usPort === topUsPort) score += 2;
    if (topForeignPort && r.foreignPort === topForeignPort) score += 1;
    if (score > bestScore) {
      best = r;
      bestScore = score;
    }
  }
  return bestScore > 0 ? best : TRADE_ROUTES[h % TRADE_ROUTES.length];
}

export function simulatePosition(
  vessel: FleetVessel & { topForeignPort?: string | null; topUsPort?: string | null },
  nowMs: number
): VesselPosition {
  const route = assignRoute(vessel.name, vessel.topForeignPort ?? null, vessel.topUsPort ?? null);
  const g = geometry(route);
  const h = hashString(vessel.name);

  const speed = 16 + (h % 40) / 10; // 16.0–19.9 knots
  const legHours = g.totalNm / speed;
  const cycleHours = 2 * (legHours + DWELL_HOURS);
  const offset = (h % 100000) / 100000 * cycleHours;
  const t = ((nowMs / 3600000 + offset) % cycleHours + cycleHours) % cycleHours;

  const last = route.waypoints[route.waypoints.length - 1];
  const first = route.waypoints[0];

  let pos: Waypoint;
  let cog = 0;
  let sog = speed;
  let destination: string | null;
  let etaHours: number | null;

  if (t < legHours) {
    // outbound: foreign -> U.S.
    ({ pos, cog } = pointAlong(g, t * speed));
    destination = route.usPort;
    etaHours = legHours - t;
  } else if (t < legHours + DWELL_HOURS) {
    pos = last;
    sog = 0;
    destination = route.usPort;
    etaHours = null; // docked
  } else if (t < 2 * legHours + DWELL_HOURS) {
    // return leg: U.S. -> foreign
    const back = t - legHours - DWELL_HOURS;
    ({ pos, cog } = pointAlong(g, g.totalNm - back * speed));
    cog = (cog + 180) % 360;
    destination = route.foreignPort;
    etaHours = legHours - back;
  } else {
    pos = first;
    sog = 0;
    destination = route.foreignPort;
    etaHours = null;
  }

  return {
    name: vessel.name,
    carrierCode: vessel.carrierCode,
    mmsi: null,
    lat: Math.round(pos.lat * 10000) / 10000,
    lon: Math.round(normalizeLon(pos.lon) * 10000) / 10000,
    sogKnots: Math.round(sog * 10) / 10,
    cogDeg: Math.round(cog),
    destination,
    etaIso: etaHours != null ? new Date(nowMs + etaHours * 3600000).toISOString() : null,
    lastSeenIso: new Date(nowMs).toISOString(),
    source: "sim",
    shipmentCount: vessel.shipmentCount,
  };
}
