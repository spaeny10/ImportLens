// Port coordinates and coarse ocean routes for the vessel-position simulator.
// Longitudes inside a route may exceed ±180 so Pacific crossings stay monotonic;
// normalize before display. Port name strings match the manifest data exactly.

export interface Waypoint {
  lon: number;
  lat: number;
}

export interface TradeRoute {
  foreignPort: string;
  usPort: string;
  waypoints: Waypoint[]; // first = foreign berth, last = U.S. berth
}

export const US_PORT_COORDS: Record<string, Waypoint> = {
  "Los Angeles, California": { lon: -118.27, lat: 33.73 },
  "Long Beach, California": { lon: -118.21, lat: 33.75 },
  "New York/Newark Area, Newark, New Jersey": { lon: -74.15, lat: 40.68 },
  "Savannah, Georgia": { lon: -81.14, lat: 32.08 },
  "Houston, Texas": { lon: -95.08, lat: 29.73 },
  "Seattle, Washington": { lon: -122.34, lat: 47.58 },
  "Oakland, California": { lon: -122.32, lat: 37.8 },
  "Charleston, South Carolina": { lon: -79.92, lat: 32.78 },
  "Norfolk, Virginia": { lon: -76.33, lat: 36.9 },
  "Tacoma, Washington": { lon: -122.42, lat: 47.27 },
};

// Shared mid-ocean corridors
const TRANSPACIFIC_NORTH: Waypoint[] = [
  { lon: 150, lat: 38.5 },
  { lon: 165, lat: 44 },
  { lon: 180, lat: 47.5 },
  { lon: 197, lat: 49 },
  { lon: 215, lat: 44 },
  { lon: 230, lat: 37 },
];
const SUEZ_TO_NY: Waypoint[] = [
  { lon: 43.5, lat: 12.4 }, // Gulf of Aden
  { lon: 40, lat: 17 }, // Red Sea
  { lon: 34, lat: 27.5 },
  { lon: 32.4, lat: 30.2 }, // Suez Canal
  { lon: 31, lat: 32 },
  { lon: 23, lat: 34.5 }, // Med
  { lon: 10, lat: 37.5 },
  { lon: -5.6, lat: 35.95 }, // Gibraltar
  { lon: -20, lat: 38 },
  { lon: -45, lat: 40.5 },
  { lon: -65, lat: 40.5 },
];
const ATLANTIC_WEST: Waypoint[] = [
  { lon: -8, lat: 48.5 },
  { lon: -25, lat: 46 },
  { lon: -45, lat: 42.5 },
  { lon: -62, lat: 40.8 },
];

export const TRADE_ROUTES: TradeRoute[] = [
  {
    foreignPort: "Shanghai, China",
    usPort: "Los Angeles, California",
    waypoints: [
      { lon: 121.9, lat: 31.2 }, { lon: 124, lat: 30.5 }, { lon: 129.3, lat: 29.7 },
      { lon: 140, lat: 33.8 }, ...TRANSPACIFIC_NORTH, { lon: 238.5, lat: 34.2 },
      { lon: 241.73, lat: 33.73 },
    ],
  },
  {
    foreignPort: "Ningbo, China",
    usPort: "Long Beach, California",
    waypoints: [
      { lon: 121.9, lat: 29.9 }, { lon: 124.5, lat: 29.5 }, { lon: 129.5, lat: 29.5 },
      { lon: 140, lat: 33.8 }, ...TRANSPACIFIC_NORTH, { lon: 238.5, lat: 34.2 },
      { lon: 241.79, lat: 33.75 },
    ],
  },
  {
    foreignPort: "Yantian, China",
    usPort: "Los Angeles, California",
    waypoints: [
      { lon: 114.28, lat: 22.55 }, { lon: 116, lat: 21.8 }, { lon: 121.3, lat: 21.3 },
      { lon: 128, lat: 24.5 }, { lon: 137, lat: 30 }, { lon: 145, lat: 35 },
      ...TRANSPACIFIC_NORTH.slice(1), { lon: 238.5, lat: 34.2 }, { lon: 241.73, lat: 33.73 },
    ],
  },
  {
    foreignPort: "Xiamen, China",
    usPort: "Long Beach, California",
    waypoints: [
      { lon: 118.1, lat: 24.4 }, { lon: 120, lat: 23.3 }, { lon: 122.5, lat: 23 },
      { lon: 130, lat: 27 }, { lon: 140, lat: 33 }, ...TRANSPACIFIC_NORTH,
      { lon: 238.5, lat: 34.2 }, { lon: 241.79, lat: 33.75 },
    ],
  },
  {
    foreignPort: "Qingdao, China",
    usPort: "Seattle, Washington",
    waypoints: [
      { lon: 120.3, lat: 36.05 }, { lon: 123.5, lat: 35 }, { lon: 126.6, lat: 33.2 },
      { lon: 130.5, lat: 32.5 }, { lon: 141, lat: 36 }, { lon: 155, lat: 43 },
      { lon: 172, lat: 50 }, { lon: 190, lat: 52.5 }, { lon: 210, lat: 51 },
      { lon: 228, lat: 48.8 }, { lon: 235.3, lat: 48.45 }, { lon: 237.2, lat: 48.2 },
      { lon: 237.66, lat: 47.58 },
    ],
  },
  {
    foreignPort: "Pusan, South Korea",
    usPort: "Tacoma, Washington",
    waypoints: [
      { lon: 129.05, lat: 35.05 }, { lon: 131, lat: 34.5 }, { lon: 137, lat: 34.2 },
      { lon: 142, lat: 37 }, { lon: 155, lat: 43.5 }, { lon: 172, lat: 50 },
      { lon: 190, lat: 52.5 }, { lon: 210, lat: 51 }, { lon: 228, lat: 48.8 },
      { lon: 235.3, lat: 48.45 }, { lon: 237.35, lat: 47.9 }, { lon: 237.58, lat: 47.27 },
    ],
  },
  {
    foreignPort: "Yokohama, Japan",
    usPort: "Oakland, California",
    waypoints: [
      { lon: 139.66, lat: 35.42 }, { lon: 141.5, lat: 35 }, { lon: 152, lat: 39.5 },
      { lon: 168, lat: 45 }, { lon: 185, lat: 47.5 }, { lon: 205, lat: 45 },
      { lon: 222, lat: 40.5 }, { lon: 235, lat: 38 }, { lon: 237.55, lat: 37.82 },
    ],
  },
  {
    foreignPort: "Kaohsiung, Taiwan",
    usPort: "Los Angeles, California",
    waypoints: [
      { lon: 120.28, lat: 22.55 }, { lon: 121.5, lat: 21.8 }, { lon: 125, lat: 22.5 },
      { lon: 132, lat: 27.5 }, { lon: 141, lat: 33.5 }, ...TRANSPACIFIC_NORTH,
      { lon: 238.5, lat: 34.2 }, { lon: 241.73, lat: 33.73 },
    ],
  },
  {
    foreignPort: "Ho Chi Minh City, Vietnam",
    usPort: "Oakland, California",
    waypoints: [
      { lon: 106.75, lat: 10.55 }, { lon: 107.2, lat: 10 }, { lon: 110, lat: 11 },
      { lon: 115, lat: 15 }, { lon: 120.8, lat: 20.5 }, { lon: 128, lat: 25 },
      { lon: 138, lat: 31.5 }, { lon: 150, lat: 38.5 }, { lon: 168, lat: 45 },
      { lon: 185, lat: 47.5 }, { lon: 205, lat: 45 }, { lon: 222, lat: 40.5 },
      { lon: 235, lat: 38 }, { lon: 237.55, lat: 37.82 },
    ],
  },
  {
    foreignPort: "Haiphong, Vietnam",
    usPort: "Long Beach, California",
    waypoints: [
      { lon: 106.8, lat: 20.8 }, { lon: 107.5, lat: 20 }, { lon: 110.5, lat: 18.5 },
      { lon: 115, lat: 18 }, { lon: 120.9, lat: 20.3 }, { lon: 128, lat: 24.5 },
      { lon: 137, lat: 30 }, { lon: 145, lat: 35 }, ...TRANSPACIFIC_NORTH.slice(1),
      { lon: 238.5, lat: 34.2 }, { lon: 241.79, lat: 33.75 },
    ],
  },
  {
    foreignPort: "Cai Mep, Vietnam",
    usPort: "Los Angeles, California",
    waypoints: [
      { lon: 107.02, lat: 10.53 }, { lon: 107.3, lat: 9.9 }, { lon: 110, lat: 11 },
      { lon: 115, lat: 15 }, { lon: 120.8, lat: 20.5 }, { lon: 128, lat: 25 },
      { lon: 138, lat: 31.5 }, { lon: 150, lat: 38.5 }, ...TRANSPACIFIC_NORTH.slice(2),
      { lon: 238.5, lat: 34.2 }, { lon: 241.73, lat: 33.73 },
    ],
  },
  {
    foreignPort: "Laem Chabang, Thailand",
    usPort: "Los Angeles, California",
    waypoints: [
      { lon: 100.9, lat: 13.05 }, { lon: 100.9, lat: 12 }, { lon: 102.5, lat: 9.5 },
      { lon: 105.5, lat: 7.5 }, { lon: 110, lat: 9 }, { lon: 115, lat: 14 },
      { lon: 120.8, lat: 20.5 }, { lon: 128, lat: 25 }, { lon: 138, lat: 31.5 },
      { lon: 150, lat: 38.5 }, ...TRANSPACIFIC_NORTH.slice(2), { lon: 238.5, lat: 34.2 },
      { lon: 241.73, lat: 33.73 },
    ],
  },
  {
    foreignPort: "Tanjung Pelepas, Malaysia",
    usPort: "Los Angeles, California",
    waypoints: [
      { lon: 103.55, lat: 1.36 }, { lon: 104.2, lat: 1.2 }, { lon: 105.8, lat: 3 },
      { lon: 109, lat: 6 }, { lon: 113, lat: 11 }, { lon: 119, lat: 18 },
      { lon: 124, lat: 22.5 }, { lon: 132, lat: 28.5 }, { lon: 142, lat: 34 },
      ...TRANSPACIFIC_NORTH.slice(1), { lon: 238.5, lat: 34.2 }, { lon: 241.73, lat: 33.73 },
    ],
  },
  {
    foreignPort: "Port Kelang, Malaysia",
    usPort: "Savannah, Georgia",
    waypoints: [
      { lon: 101.3, lat: 3.0 }, { lon: 100.3, lat: 2.8 }, { lon: 98, lat: 4.5 },
      { lon: 95, lat: 6 }, { lon: 88, lat: 6.5 }, { lon: 80, lat: 6 },
      { lon: 73, lat: 8 }, { lon: 60, lat: 11 }, ...SUEZ_TO_NY.slice(0, 9),
      { lon: -30, lat: 36 }, { lon: -55, lat: 33 }, { lon: -75, lat: 31.5 },
      { lon: -80.85, lat: 31.99 }, { lon: -81.14, lat: 32.08 },
    ],
  },
  {
    foreignPort: "Jakarta, Indonesia",
    usPort: "Houston, Texas",
    waypoints: [
      { lon: 106.88, lat: -6.1 }, { lon: 106.5, lat: -5.5 }, { lon: 105.2, lat: -4.5 },
      { lon: 104.5, lat: -2 }, { lon: 104.3, lat: 1 }, { lon: 100.3, lat: 2.8 },
      { lon: 95, lat: 6 }, { lon: 80, lat: 6 }, { lon: 60, lat: 11 },
      ...SUEZ_TO_NY.slice(0, 9), { lon: -35, lat: 32 }, { lon: -60, lat: 26 },
      { lon: -75, lat: 24 }, { lon: -80.3, lat: 24 }, { lon: -85.5, lat: 23.8 },
      { lon: -90, lat: 25.5 }, { lon: -94.4, lat: 28.6 }, { lon: -95.08, lat: 29.73 },
    ],
  },
  {
    foreignPort: "Nhava Sheva, India",
    usPort: "New York/Newark Area, Newark, New Jersey",
    waypoints: [
      { lon: 72.95, lat: 18.95 }, { lon: 72.5, lat: 18.5 }, { lon: 68, lat: 15 },
      { lon: 58, lat: 13 }, { lon: 50, lat: 12.8 }, ...SUEZ_TO_NY,
      { lon: -73.9, lat: 40.55 }, { lon: -74.15, lat: 40.68 },
    ],
  },
  {
    foreignPort: "Mundra, India",
    usPort: "Norfolk, Virginia",
    waypoints: [
      { lon: 69.7, lat: 22.75 }, { lon: 68.8, lat: 22 }, { lon: 66, lat: 18 },
      { lon: 58, lat: 13.5 }, { lon: 50, lat: 12.8 }, ...SUEZ_TO_NY.slice(0, 10),
      { lon: -50, lat: 38.5 }, { lon: -70, lat: 37 }, { lon: -75.9, lat: 36.95 },
      { lon: -76.33, lat: 36.9 },
    ],
  },
  {
    foreignPort: "Chennai, India",
    usPort: "Savannah, Georgia",
    waypoints: [
      { lon: 80.3, lat: 13.1 }, { lon: 80.8, lat: 12 }, { lon: 81.8, lat: 7.5 },
      { lon: 80.5, lat: 5.5 }, { lon: 74, lat: 6.5 }, { lon: 60, lat: 11 },
      ...SUEZ_TO_NY.slice(0, 9), { lon: -30, lat: 36 }, { lon: -55, lat: 33 },
      { lon: -75, lat: 31.5 }, { lon: -80.85, lat: 31.99 }, { lon: -81.14, lat: 32.08 },
    ],
  },
  {
    foreignPort: "Rotterdam, Netherlands",
    usPort: "New York/Newark Area, Newark, New Jersey",
    waypoints: [
      { lon: 4.05, lat: 51.95 }, { lon: 3.4, lat: 51.9 }, { lon: 1.8, lat: 51.3 },
      { lon: 0.2, lat: 50.5 }, { lon: -2.5, lat: 49.8 }, ...ATLANTIC_WEST,
      { lon: -73.9, lat: 40.55 }, { lon: -74.15, lat: 40.68 },
    ],
  },
  {
    foreignPort: "Hamburg, Germany",
    usPort: "Charleston, South Carolina",
    waypoints: [
      { lon: 9.95, lat: 53.55 }, { lon: 8.7, lat: 53.9 }, { lon: 6.5, lat: 54.2 },
      { lon: 4, lat: 52.8 }, { lon: 1.8, lat: 51.3 }, { lon: -2.5, lat: 49.8 },
      { lon: -10, lat: 47.5 }, { lon: -30, lat: 42 }, { lon: -55, lat: 35 },
      { lon: -75, lat: 32.5 }, { lon: -79.6, lat: 32.6 }, { lon: -79.92, lat: 32.78 },
    ],
  },
  {
    foreignPort: "Bremerhaven, Germany",
    usPort: "Norfolk, Virginia",
    waypoints: [
      { lon: 8.55, lat: 53.55 }, { lon: 8, lat: 54 }, { lon: 6, lat: 54.2 },
      { lon: 4, lat: 52.8 }, { lon: 1.8, lat: 51.3 }, { lon: -2.5, lat: 49.8 },
      { lon: -10, lat: 47.5 }, { lon: -30, lat: 43 }, { lon: -55, lat: 38.5 },
      { lon: -72, lat: 37 }, { lon: -75.9, lat: 36.95 }, { lon: -76.33, lat: 36.9 },
    ],
  },
  {
    foreignPort: "Genoa, Italy",
    usPort: "New York/Newark Area, Newark, New Jersey",
    waypoints: [
      { lon: 8.92, lat: 44.4 }, { lon: 8.8, lat: 43.8 }, { lon: 7.5, lat: 42.5 },
      { lon: 4.5, lat: 40 }, { lon: 0, lat: 37.8 }, { lon: -5.6, lat: 35.95 },
      { lon: -15, lat: 36.5 }, { lon: -35, lat: 39 }, { lon: -55, lat: 40 },
      { lon: -70, lat: 40.3 }, { lon: -73.9, lat: 40.55 }, { lon: -74.15, lat: 40.68 },
    ],
  },
  {
    foreignPort: "Santos, Brazil",
    usPort: "Houston, Texas",
    waypoints: [
      { lon: -46.3, lat: -23.98 }, { lon: -46, lat: -24.3 }, { lon: -44, lat: -23.5 },
      { lon: -39, lat: -18 }, { lon: -35, lat: -8 }, { lon: -38, lat: 0 },
      { lon: -45, lat: 6 }, { lon: -55, lat: 11 }, { lon: -65, lat: 14 },
      { lon: -75, lat: 17.5 }, { lon: -82, lat: 20.5 }, { lon: -85.8, lat: 22.5 },
      { lon: -90, lat: 25 }, { lon: -94.4, lat: 28.6 }, { lon: -95.08, lat: 29.73 },
    ],
  },
  {
    foreignPort: "Veracruz, Mexico",
    usPort: "Houston, Texas",
    waypoints: [
      { lon: -96.13, lat: 19.2 }, { lon: -95.8, lat: 19.6 }, { lon: -95.2, lat: 21.5 },
      { lon: -94.8, lat: 24.5 }, { lon: -94.5, lat: 27 }, { lon: -94.4, lat: 28.6 },
      { lon: -95.08, lat: 29.73 },
    ],
  },
];
