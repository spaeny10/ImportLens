"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import type { Map as LeafletMap } from "leaflet";
import "leaflet/dist/leaflet.css";
import type { VesselPosition } from "../lib/ais/types";
import { fmtDate, fmtInt } from "../lib/format";

// Leaflet touches `window` at import time — everything map-shaped loads
// client-side only.
const MapContainer = dynamic(() => import("react-leaflet").then((m) => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import("react-leaflet").then((m) => m.TileLayer), { ssr: false });
const Marker = dynamic(() => import("react-leaflet").then((m) => m.Marker), { ssr: false });
const Popup = dynamic(() => import("react-leaflet").then((m) => m.Popup), { ssr: false });

const TILE_URL = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
const TILE_ATTR =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';

function useShipIcon() {
  const [leaflet, setLeaflet] = useState<typeof import("leaflet") | null>(null);
  useEffect(() => {
    import("leaflet").then(setLeaflet);
  }, []);
  return useMemo(() => {
    if (!leaflet) return null;
    return (cog: number, moving: boolean, live: boolean) => {
      const color = live ? "#34d399" : "#3987e5";
      const html = moving
        ? `<svg width="26" height="26" viewBox="-13 -13 26 26" style="transform: rotate(${cog}deg)">
             <path d="M0,-9 L5,7 L0,4 L-5,7 Z" fill="${color}" stroke="#0f172a" stroke-width="1.2"/>
           </svg>`
        : `<svg width="26" height="26" viewBox="-13 -13 26 26">
             <circle r="4.5" fill="${color}" stroke="#0f172a" stroke-width="1.5"/>
           </svg>`;
      return leaflet.divIcon({ html, className: "", iconSize: [26, 26], iconAnchor: [13, 13] });
    };
  }, [leaflet]);
}

export function useFleetPositions(pollMs = 30000) {
  const [positions, setPositions] = useState<VesselPosition[] | null>(null);
  useEffect(() => {
    let alive = true;
    const load = () =>
      fetch("/api/vessels")
        .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
        .then((d) => alive && setPositions(d.positions))
        .catch(() => {});
    load();
    const id = setInterval(load, pollMs);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [pollMs]);
  return positions;
}

function VesselPopup({ v }: { v: VesselPosition }) {
  return (
    <div className="text-xs leading-relaxed">
      <div className="font-semibold">
        <Link href={`/vessels/${encodeURIComponent(v.name)}`} className="text-sky-600 underline">
          {v.name}
        </Link>{" "}
        {v.carrierCode && <span className="text-slate-500">({v.carrierCode})</span>}
      </div>
      <div>
        {v.sogKnots > 0.5 ? `${v.sogKnots} kn · course ${v.cogDeg}°` : "In port / at anchor"}
      </div>
      {v.destination && <div>→ {v.destination}</div>}
      {v.etaIso && <div>ETA {fmtDate(v.etaIso.slice(0, 10))}</div>}
      <div>{fmtInt(v.shipmentCount)} BOLs in dataset</div>
      <div className={v.source === "ais" ? "text-emerald-600" : "text-slate-500"}>
        {v.source === "ais" ? "LIVE AIS" : "Simulated position"}
      </div>
    </div>
  );
}

export function VesselMarkers({ positions }: { positions: VesselPosition[] }) {
  const makeIcon = useShipIcon();
  if (!makeIcon) return null;
  return (
    <>
      {positions.map((v) => (
        <Marker
          key={v.name}
          position={[v.lat, v.lon]}
          icon={makeIcon(v.cogDeg, v.sogKnots > 0.5, v.source === "ais")}
        >
          <Popup>
            <VesselPopup v={v} />
          </Popup>
        </Marker>
      ))}
    </>
  );
}

export function FleetMapPanel() {
  const positions = useFleetPositions();
  const mapRef = useRef<LeafletMap | null>(null);
  const [filter, setFilter] = useState("");

  const shown = useMemo(() => {
    if (!positions) return [];
    const f = filter.trim().toUpperCase();
    const list = f ? positions.filter((p) => p.name.toUpperCase().includes(f)) : positions;
    return [...list].sort((a, b) => b.shipmentCount - a.shipmentCount);
  }, [positions, filter]);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[280px_1fr]">
      <div className="flex max-h-[70vh] flex-col rounded-xl border border-slate-800 bg-slate-900">
        <div className="border-b border-slate-800 p-3">
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter vessels…"
            className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-sky-500 focus:outline-none"
          />
          <p className="mt-2 text-xs text-slate-500">
            {positions ? `${shown.length} of ${positions.length} vessels` : "Loading fleet…"}
          </p>
        </div>
        <ul className="flex-1 divide-y divide-slate-800/70 overflow-y-auto">
          {shown.map((v) => (
            <li key={v.name} className="flex items-center gap-2 px-3 py-2">
              <button
                type="button"
                onClick={() => mapRef.current?.flyTo([v.lat, v.lon], 5, { duration: 1.2 })}
                title="Locate on map"
                className="rounded border border-slate-700 px-1.5 py-0.5 text-xs text-slate-400 hover:bg-slate-800"
              >
                ◎
              </button>
              <div className="min-w-0 flex-1">
                <Link
                  href={`/vessels/${encodeURIComponent(v.name)}`}
                  className="block truncate text-sm text-slate-200 hover:text-sky-400 hover:underline"
                >
                  {v.name}
                </Link>
                <div className="truncate text-xs text-slate-500">
                  {v.sogKnots > 0.5 ? `${v.sogKnots} kn → ${v.destination ?? "—"}` : `In port · ${v.destination ?? "—"}`}
                </div>
              </div>
              {v.source === "ais" && (
                <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-400">
                  LIVE
                </span>
              )}
            </li>
          ))}
        </ul>
      </div>
      <div className="h-[70vh] overflow-hidden rounded-xl border border-slate-800">
        <MapContainer
          center={[30, -150]}
          zoom={3}
          minZoom={2}
          className="h-full w-full"
          ref={mapRef}
          worldCopyJump
        >
          <TileLayer url={TILE_URL} attribution={TILE_ATTR} />
          {positions && <VesselMarkers positions={positions} />}
        </MapContainer>
      </div>
    </div>
  );
}

export function SingleVesselMap({ name }: { name: string }) {
  const positions = useFleetPositions();
  const v = positions?.find((p) => p.name.toUpperCase() === name.toUpperCase());
  return (
    <div className="h-[420px] overflow-hidden rounded-xl border border-slate-800">
      {v ? (
        <MapContainer center={[v.lat, v.lon]} zoom={4} minZoom={2} className="h-full w-full" worldCopyJump>
          <TileLayer url={TILE_URL} attribution={TILE_ATTR} />
          <VesselMarkers positions={[v]} />
        </MapContainer>
      ) : (
        <div className="flex h-full items-center justify-center text-sm text-slate-500">
          Loading position…
        </div>
      )}
    </div>
  );
}
