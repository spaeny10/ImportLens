export interface VesselPosition {
  name: string;
  carrierCode: string | null;
  mmsi: string | null;
  lat: number;
  lon: number;
  sogKnots: number; // speed over ground
  cogDeg: number; // course over ground
  destination: string | null;
  etaIso: string | null;
  lastSeenIso: string;
  source: "sim" | "ais";
  shipmentCount: number; // BOLs carried by this vessel in our manifest data
}

export interface FleetVessel {
  name: string;
  carrierCode: string | null;
  shipmentCount: number;
}
