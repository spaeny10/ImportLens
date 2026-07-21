import fs from "fs";
import path from "path";
import { toCsv } from "../ams/csv";

// Generates a realistic sample dataset in the exact CBP AMS FOIA vessel
// manifest CSV format, so the ingest pipeline exercised here is the same one
// that will consume the real paid feed later.

// Deterministic PRNG (mulberry32) so re-runs produce the same world.
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = rng(20260721);
const pick = <T,>(arr: T[]): T => arr[Math.floor(rand() * arr.length)];
const randInt = (min: number, max: number) => min + Math.floor(rand() * (max - min + 1));

// Power-law weighted pick: index 0 is most likely.
function pickWeighted<T>(arr: T[], skew = 1.6): T {
  const i = Math.floor(arr.length * Math.pow(rand(), skew));
  return arr[Math.min(i, arr.length - 1)];
}

// ---------------------------------------------------------------------------
// World data
// ---------------------------------------------------------------------------
interface Product {
  hs: string; // 6-digit HS
  descs: string[];
  unitKg: [number, number]; // weight per piece range
}

const PRODUCTS: Product[] = [
  { hs: "940360", descs: ["WOODEN BEDROOM FURNITURE", "OAK DINING TABLES", "WOODEN BOOKSHELVES"], unitKg: [18, 60] },
  { hs: "940171", descs: ["UPHOLSTERED SOFAS", "RECLINER CHAIRS", "ACCENT CHAIRS UPHOLSTERED"], unitKg: [25, 55] },
  { hs: "940540", descs: ["LED CEILING LIGHT FIXTURES", "LED DESK LAMPS", "LED FLOOD LIGHTS"], unitKg: [1, 6] },
  { hs: "640411", descs: ["ATHLETIC FOOTWEAR RUBBER SOLE", "RUNNING SHOES TEXTILE UPPER", "SPORTS SNEAKERS"], unitKg: [1, 2] },
  { hs: "610910", descs: ["COTTON T-SHIRTS KNITTED", "MENS COTTON TEE SHIRTS", "PRINTED COTTON T-SHIRTS"], unitKg: [1, 1] },
  { hs: "850760", descs: ["LITHIUM ION BATTERY PACKS", "RECHARGEABLE LITHIUM BATTERIES UN3480", "LI-ION BATTERY CELLS"], unitKg: [2, 12] },
  { hs: "950300", descs: ["PLASTIC TOYS ASSORTED", "CHILDRENS BUILDING BLOCK SETS", "TOY VEHICLES DIE CAST"], unitKg: [1, 4] },
  { hs: "690721", descs: ["CERAMIC FLOOR TILES", "PORCELAIN WALL TILES", "GLAZED CERAMIC TILES"], unitKg: [20, 30] },
  { hs: "870830", descs: ["BRAKE PADS AUTO PARTS", "DISC BRAKE ROTORS", "AUTOMOTIVE BRAKE ASSEMBLIES"], unitKg: [4, 18] },
  { hs: "871200", descs: ["BICYCLES COMPLETE", "MOUNTAIN BICYCLES 26 INCH", "FOLDING BICYCLES"], unitKg: [12, 18] },
  { hs: "732393", descs: ["STAINLESS STEEL COOKWARE SETS", "SS KITCHEN UTENSILS", "STAINLESS STEEL STOCK POTS"], unitKg: [3, 10] },
  { hs: "854143", descs: ["PHOTOVOLTAIC SOLAR PANELS", "SOLAR MODULES 550W", "MONOCRYSTALLINE SOLAR PANELS"], unitKg: [22, 30] },
  { hs: "391810", descs: ["PVC VINYL FLOORING PLANKS", "SPC FLOORING CLICK LOCK", "LUXURY VINYL TILE"], unitKg: [15, 25] },
  { hs: "851660", descs: ["ELECTRIC AIR FRYERS", "COUNTERTOP CONVECTION OVENS", "ELECTRIC RICE COOKERS"], unitKg: [4, 9] },
  { hs: "847130", descs: ["PORTABLE LAPTOP COMPUTERS", "NOTEBOOK COMPUTERS 15.6 INCH", "TABLET COMPUTERS"], unitKg: [2, 4] },
  { hs: "830242", descs: ["FURNITURE HARDWARE FITTINGS", "DRAWER SLIDES METAL", "CABINET HINGES"], unitKg: [8, 20] },
  { hs: "420292", descs: ["BACKPACKS TEXTILE", "TRAVEL DUFFEL BAGS", "LAPTOP BAGS NYLON"], unitKg: [1, 3] },
  { hs: "630260", descs: ["COTTON BATH TOWELS", "TERRY TOWEL SETS", "COTTON BEACH TOWELS"], unitKg: [5, 12] },
  { hs: "852872", descs: ["LED TELEVISION SETS 55 INCH", "SMART TV LCD PANELS", "4K UHD TELEVISIONS"], unitKg: [12, 25] },
  { hs: "940320", descs: ["METAL SHELVING UNITS", "STEEL STORAGE RACKS", "METAL OFFICE FURNITURE"], unitKg: [15, 40] },
  { hs: "961900", descs: ["DISPOSABLE BABY DIAPERS", "SANITARY NAPKINS", "ADULT INCONTINENCE PRODUCTS"], unitKg: [6, 12] },
  { hs: "392410", descs: ["PLASTIC KITCHENWARE", "FOOD STORAGE CONTAINERS PLASTIC", "MELAMINE TABLEWARE"], unitKg: [4, 10] },
  { hs: "845011", descs: ["AUTOMATIC WASHING MACHINES", "FRONT LOAD WASHERS", "WASHER DRYER COMBOS"], unitKg: [60, 85] },
  { hs: "902139", descs: ["ORTHOPEDIC APPLIANCES", "KNEE BRACES MEDICAL", "ORTHOTIC INSOLES"], unitKg: [1, 3] },
  { hs: "330499", descs: ["SKIN CARE PREPARATIONS", "FACIAL CREAM COSMETICS", "BEAUTY SERUM PRODUCTS"], unitKg: [4, 8] },
  { hs: "090111", descs: ["GREEN COFFEE BEANS ARABICA", "COFFEE NOT ROASTED", "ORGANIC COFFEE BEANS IN BAGS"], unitKg: [60, 70] },
  { hs: "081090", descs: ["FRESH DRAGON FRUIT", "FRESH LYCHEES REFRIGERATED", "FRESH RAMBUTAN"], unitKg: [8, 15] },
  { hs: "160414", descs: ["CANNED TUNA IN OIL", "SKIPJACK TUNA CANNED", "TUNA LOINS FROZEN"], unitKg: [10, 20] },
  { hs: "440929", descs: ["HARDWOOD FLOORING STRIPS", "ENGINEERED WOOD FLOORING", "OAK FLOORING PLANKS"], unitKg: [18, 28] },
  { hs: "701337", descs: ["GLASS DRINKING TUMBLERS", "GLASSWARE FOR TABLE USE", "WINE GLASSES"], unitKg: [8, 14] },
];

const US_PORTS = [
  "Los Angeles, California",
  "Long Beach, California",
  "New York/Newark Area, Newark, New Jersey",
  "Savannah, Georgia",
  "Houston, Texas",
  "Seattle, Washington",
  "Oakland, California",
  "Charleston, South Carolina",
  "Norfolk, Virginia",
  "Tacoma, Washington",
];

interface ForeignPort { name: string; country: string; }
const FOREIGN_PORTS: Record<string, ForeignPort[]> = {
  CN: [
    { name: "Shanghai, China", country: "CN" },
    { name: "Ningbo, China", country: "CN" },
    { name: "Yantian, China", country: "CN" },
    { name: "Qingdao, China", country: "CN" },
    { name: "Xiamen, China", country: "CN" },
  ],
  VN: [
    { name: "Ho Chi Minh City, Vietnam", country: "VN" },
    { name: "Haiphong, Vietnam", country: "VN" },
    { name: "Cai Mep, Vietnam", country: "VN" },
  ],
  IN: [
    { name: "Nhava Sheva, India", country: "IN" },
    { name: "Mundra, India", country: "IN" },
    { name: "Chennai, India", country: "IN" },
  ],
  TW: [{ name: "Kaohsiung, Taiwan", country: "TW" }],
  KR: [{ name: "Pusan, South Korea", country: "KR" }],
  TH: [{ name: "Laem Chabang, Thailand", country: "TH" }],
  MY: [{ name: "Tanjung Pelepas, Malaysia", country: "MY" }, { name: "Port Kelang, Malaysia", country: "MY" }],
  ID: [{ name: "Jakarta, Indonesia", country: "ID" }],
  DE: [{ name: "Hamburg, Germany", country: "DE" }, { name: "Bremerhaven, Germany", country: "DE" }],
  NL: [{ name: "Rotterdam, Netherlands", country: "NL" }],
  IT: [{ name: "Genoa, Italy", country: "IT" }],
  BR: [{ name: "Santos, Brazil", country: "BR" }],
  MX: [{ name: "Veracruz, Mexico", country: "MX" }],
  JP: [{ name: "Yokohama, Japan", country: "JP" }],
};

const CARRIERS = [
  { scac: "MAEU", vessels: ["MAERSK ESSEX", "MAERSK EMDEN", "MAERSK ALGOL", "MADISON MAERSK"], flag: "DK" },
  { scac: "MSCU", vessels: ["MSC ISABELLA", "MSC MIA", "MSC AMBRA", "MSC VIRTUOSA"], flag: "PA" },
  { scac: "CMDU", vessels: ["CMA CGM MARCO POLO", "CMA CGM BENJAMIN FRANKLIN", "CMA CGM ARGENTINA"], flag: "MT" },
  { scac: "EGLV", vessels: ["EVER FORWARD", "EVER LIBRA", "EVER LOYAL", "EVER FRONT"], flag: "PA" },
  { scac: "COSU", vessels: ["COSCO SHIPPING PISCES", "COSCO HARMONY", "COSCO EXCELLENCE"], flag: "HK" },
  { scac: "OOLU", vessels: ["OOCL HONG KONG", "OOCL GERMANY", "OOCL SPAIN"], flag: "HK" },
  { scac: "HLCU", vessels: ["HAMBURG EXPRESS", "BERLIN EXPRESS", "AL ZUBARA"], flag: "DE" },
  { scac: "ONEY", vessels: ["ONE APUS", "ONE STORK", "ONE INNOVATION"], flag: "JP" },
  { scac: "HDMU", vessels: ["HMM ALGECIRAS", "HMM OSLO", "HMM SOUTHAMPTON"], flag: "KR" },
  { scac: "YMLU", vessels: ["YM WITNESS", "YM TRIUMPH", "YM WARRANTY"], flag: "TW" },
];

const US_CITIES: [string, string, string][] = [
  ["LOS ANGELES", "CA", "90021"], ["LONG BEACH", "CA", "90802"], ["CITY OF INDUSTRY", "CA", "91748"],
  ["NEW YORK", "NY", "10018"], ["EDISON", "NJ", "08817"], ["SECAUCUS", "NJ", "07094"],
  ["ATLANTA", "GA", "30336"], ["SAVANNAH", "GA", "31408"], ["HOUSTON", "TX", "77029"],
  ["DALLAS", "TX", "75212"], ["CHICAGO", "IL", "60632"], ["ELK GROVE VILLAGE", "IL", "60007"],
  ["SEATTLE", "WA", "98134"], ["KENT", "WA", "98032"], ["MIAMI", "FL", "33172"],
  ["CHARLOTTE", "NC", "28273"], ["COLUMBUS", "OH", "43228"], ["MEMPHIS", "TN", "38118"],
  ["PHOENIX", "AZ", "85043"], ["DENVER", "CO", "80239"],
];

const IMPORTER_FIRST = [
  "PACIFIC", "SUMMIT", "ATLAS", "GOLDEN STATE", "EVERBRIGHT", "NORTHSTAR", "BLUE HARBOR",
  "CASCADE", "LIBERTY", "PINNACLE", "REDWOOD", "SILVERLINE", "TRISTATE", "AMERITRADE",
  "KEYSTONE", "HORIZON", "GRANITE", "LONE STAR", "BAYSIDE", "CROSSROADS", "IRONWOOD",
  "MERIDIAN", "FRONTIER", "HARBORVIEW", "STERLING", "OAKRIDGE", "CLEARWATER", "MIDWEST",
  "SUNCOAST", "EASTGATE", "WESTPORT", "GRANDVIEW", "FIVE RIVERS", "COPPERFIELD", "BRIGHTPATH",
];
const IMPORTER_DOMAIN = [
  "HOME GOODS", "TRADING", "IMPORTS", "DISTRIBUTION", "OUTDOOR PRODUCTS", "FURNITURE",
  "ELECTRONICS", "APPAREL GROUP", "KITCHEN SUPPLY", "AUTO SUPPLY", "FLOORING", "LIGHTING",
  "TOYS AND GAMES", "SPORTING GOODS", "HOUSEWARES", "BUILDING PRODUCTS", "CONSUMER BRANDS",
  "FOODS", "BEVERAGE COMPANY", "MEDICAL SUPPLY", "PET PRODUCTS", "GARDEN SUPPLY",
];
const IMPORTER_SUFFIX = ["INC", "LLC", "CORP", "CO", "GROUP INC", "USA INC", "COMPANY"];

const SUPPLIER_CITY: Record<string, string[]> = {
  CN: ["SHENZHEN", "NINGBO", "GUANGZHOU", "SHANGHAI", "QINGDAO", "XIAMEN", "FOSHAN", "DONGGUAN", "HANGZHOU", "YIWU"],
  VN: ["HO CHI MINH", "HANOI", "BINH DUONG", "DA NANG", "HAIPHONG"],
  IN: ["MUMBAI", "DELHI", "CHENNAI", "AHMEDABAD", "JAIPUR", "TIRUPUR"],
  TW: ["TAIPEI", "TAICHUNG", "KAOHSIUNG"],
  KR: ["SEOUL", "BUSAN", "INCHEON"],
  TH: ["BANGKOK", "CHONBURI"],
  MY: ["KUALA LUMPUR", "PENANG"],
  ID: ["JAKARTA", "SURABAYA"],
  DE: ["HAMBURG", "MUNICH", "STUTTGART"],
  NL: ["ROTTERDAM", "AMSTERDAM"],
  IT: ["MILAN", "TREVISO"],
  BR: ["SAO PAULO", "SANTOS"],
  MX: ["MONTERREY", "MEXICO CITY"],
  JP: ["TOKYO", "OSAKA", "NAGOYA"],
};
const SUPPLIER_DOMAIN = [
  "TECHNOLOGY", "INDUSTRIAL", "MANUFACTURING", "TRADING", "IMPORT AND EXPORT",
  "ELECTRONICS", "FURNITURE", "HOUSEWARE", "TEXTILE", "GARMENTS", "PLASTICS",
  "HARDWARE", "MACHINERY", "PRECISION", "OPTOELECTRONICS", "FOODSTUFF", "ENTERPRISE",
];
const SUPPLIER_SUFFIX: Record<string, string[]> = {
  CN: ["CO LTD", "CO., LTD.", "INDUSTRY CO LTD", "TECHNOLOGY CO LTD"],
  VN: ["CO LTD", "JOINT STOCK COMPANY", "CORPORATION"],
  IN: ["PVT LTD", "PRIVATE LIMITED", "EXPORTS PVT LTD"],
  TW: ["CO LTD", "CORP", "INDUSTRIAL CO LTD"],
  KR: ["CO LTD", "CORPORATION"],
  TH: ["CO LTD", "PUBLIC CO LTD"],
  MY: ["SDN BHD"],
  ID: ["PT"],
  DE: ["GMBH", "GMBH AND CO KG"],
  NL: ["BV"],
  IT: ["SRL", "SPA"],
  BR: ["LTDA", "SA"],
  MX: ["SA DE CV"],
  JP: ["CO LTD", "KAISHA LTD"],
};

interface Importer {
  name: string; city: string; state: string; zip: string;
  products: Product[]; suppliers: Supplier[]; volume: number;
}
interface Supplier {
  name: string; country: string; city: string;
  port: ForeignPort; products: Product[];
}

function buildWorld() {
  const countries = Object.keys(FOREIGN_PORTS);
  const countryWeights = ["CN", "CN", "CN", "CN", "CN", "VN", "VN", "IN", "IN", "TW", "KR", "TH", "MY", "ID", "DE", "NL", "IT", "BR", "MX", "JP"];

  const suppliers: Supplier[] = [];
  const usedSupplier = new Set<string>();
  while (suppliers.length < 170) {
    const country = pick(countryWeights.filter((c) => countries.includes(c)));
    const city = pick(SUPPLIER_CITY[country]);
    const name = `${city} ${pick(IMPORTER_FIRST)} ${pick(SUPPLIER_DOMAIN)} ${pick(SUPPLIER_SUFFIX[country])}`
      .replace(/\s+/g, " ");
    if (usedSupplier.has(name)) continue;
    usedSupplier.add(name);
    const productCount = randInt(1, 3);
    const products: Product[] = [];
    while (products.length < productCount) {
      const p = pick(PRODUCTS);
      if (!products.includes(p)) products.push(p);
    }
    suppliers.push({ name, country, city, port: pick(FOREIGN_PORTS[country]), products });
  }

  const importers: Importer[] = [];
  const usedImporter = new Set<string>();
  while (importers.length < 120) {
    const name = `${pick(IMPORTER_FIRST)} ${pick(IMPORTER_DOMAIN)} ${pick(IMPORTER_SUFFIX)}`;
    if (usedImporter.has(name)) continue;
    usedImporter.add(name);
    const [city, state, zip] = pick(US_CITIES);
    const supplierCount = randInt(2, 8);
    const mySuppliers: Supplier[] = [];
    while (mySuppliers.length < supplierCount) {
      const s = pick(suppliers);
      if (!mySuppliers.includes(s)) mySuppliers.push(s);
    }
    const products = [...new Set(mySuppliers.flatMap((s) => s.products))];
    // Power-law importer size: a few giants, a long tail.
    const volume = Math.max(4, Math.round(400 * Math.pow(rand(), 2.6)));
    importers.push({ name, city, state, zip, products, suppliers: mySuppliers, volume });
  }
  return { importers, suppliers };
}

// Occasionally vary the raw party name so ingest normalization has real work.
function varyName(name: string): string {
  if (rand() > 0.12) return name;
  return name
    .replace(/\bINCORPORATED\b|\bINC\b/, () => (rand() > 0.5 ? "INC." : "INCORPORATED"))
    .replace(/\bCORPORATION\b|\bCORP\b/, () => (rand() > 0.5 ? "CORP." : "CORPORATION"))
    .replace(/\bCO LTD\b/, () => (rand() > 0.5 ? "CO., LTD." : "CO.,LTD"));
}

function fmtDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export interface GenerateOptions {
  outDir: string;
  shipmentCount?: number;
  startDate?: string; // YYYY-MM-DD
  endDate?: string;
}

export function generateSampleData({
  outDir,
  shipmentCount = 8000,
  startDate = "2025-01-01",
  endDate = "2026-07-20",
}: GenerateOptions) {
  const { importers } = buildWorld();
  fs.mkdirSync(outDir, { recursive: true });

  const start = new Date(startDate + "T00:00:00Z").getTime();
  const end = new Date(endDate + "T00:00:00Z").getTime();

  // Build a weighted importer pool so shipment counts follow importer volume.
  const pool: Importer[] = [];
  for (const imp of importers) for (let i = 0; i < imp.volume; i++) pool.push(imp);

  const header: (string | number)[][] = [];
  const bill: (string | number)[][] = [];
  const shipperRows: (string | number)[][] = [];
  const consigneeRows: (string | number)[][] = [];
  const notifyRows: (string | number)[][] = [];
  const cargoRows: (string | number)[][] = [];
  const containerRows: (string | number)[][] = [];
  const tariffRows: (string | number)[][] = [];

  let seq = 1;
  for (let n = 0; n < shipmentCount; n++) {
    const imp = pick(pool);
    const sup = pickWeighted(imp.suppliers, 1.4);
    const product = pick(sup.products);
    const carrier = pick(CARRIERS);
    const vessel = pick(carrier.vessels);

    // Growth over time + mild Q4 seasonality.
    let t: number;
    do {
      const u = Math.pow(rand(), 0.8); // skew toward recent dates
      t = start + u * (end - start);
      const month = new Date(t).getUTCMonth();
      const seasonal = month >= 8 && month <= 10 ? 1.0 : 0.75;
      if (rand() < seasonal) break;
    } while (true);
    const eta = new Date(t);
    const ata = new Date(t + (randInt(-1, 3) * 86400000));

    const arrivalYmd = fmtDate(ata).replace(/-/g, "");
    const identifier = `${arrivalYmd}${String(seq++).padStart(6, "0")}`;

    const usPort = imp.state === "CA" || imp.state === "WA" || imp.state === "AZ" || imp.state === "CO"
      ? pick(US_PORTS.filter((p) => /California|Washington/.test(p)))
      : pick(US_PORTS);

    const containerCount = pickWeighted([1, 1, 1, 2, 2, 3, 4, 5], 1);
    const pieceCount = randInt(80, 2400);
    const unitKg = randInt(product.unitKg[0], product.unitKg[1]);
    const weightKg = Math.max(200, pieceCount * unitKg + randInt(-100, 100));
    const desc = pick(product.descs);
    const masterBol = `${carrier.scac}${randInt(100000000, 999999999)}`;

    header.push([
      identifier, carrier.scac, carrier.flag, vessel, usPort, fmtDate(eta),
      "Schedule K Foreign Port", sup.port.name, pieceCount, "CTN", weightKg, "Kilograms",
      "New", sup.city, "", "", "", "10", fmtDate(ata),
    ]);
    bill.push([identifier, masterBol, rand() < 0.35 ? `HBL${randInt(1000000, 9999999)}` : "", `${randInt(1, 260)}E`, rand() < 0.35 ? "House Bill" : "Master Bill"]);

    shipperRows.push([
      identifier, varyName(sup.name),
      `${randInt(1, 999)} ${pick(["INDUSTRIAL ZONE", "EXPORT PROCESSING ZONE", "HIGH TECH PARK", "TRADE CENTER", "INDUSTRIAL ROAD"])}`,
      "", sup.city, "", "", sup.country,
    ]);
    consigneeRows.push([
      identifier, varyName(imp.name),
      `${randInt(100, 9999)} ${pick(["DISTRIBUTION WAY", "COMMERCE ST", "INDUSTRIAL BLVD", "GATEWAY DR", "LOGISTICS PKWY"])}`,
      "", imp.city, imp.state, imp.zip, "US",
    ]);
    if (rand() < 0.7) {
      notifyRows.push([
        identifier,
        rand() < 0.5 ? varyName(imp.name) : `${pick(["EXPEDITORS", "FLEXPORT", "CH ROBINSON", "KUEHNE NAGEL", "DSV AIR AND SEA", "GEODIS"])} ${pick(["INC", "LLC", "INTERNATIONAL"])}`,
        `${randInt(100, 9999)} ${pick(["AIRPORT RD", "HARBOR BLVD", "5TH AVE", "MAIN ST"])}`,
        imp.city, imp.state, imp.zip, "US",
      ]);
    }

    for (let c = 0; c < containerCount; c++) {
      const containerNumber = `${pick(["MSKU", "MSCU", "CMAU", "EGHU", "CSNU", "OOLU", "HLXU", "ONEU", "TCLU", "FCIU"])}${randInt(1000000, 9999999)}`;
      const type = pick(["40HC", "40GP", "20GP", "45HC"]);
      containerRows.push([
        identifier, containerNumber, `CN${randInt(100000, 999999)}`, type,
        type.startsWith("2") ? "20" : type.startsWith("45") ? "45" : "40",
        type.includes("HC") ? "96" : "86", "96", type, "Loaded", "House to House",
      ]);
      const cPieces = Math.round(pieceCount / containerCount);
      cargoRows.push([
        identifier, containerNumber, c + 1, cPieces,
        `${cPieces} CTNS ${desc} ${rand() < 0.4 ? `PO NO ${randInt(10000, 99999)} ` : ""}${rand() < 0.5 ? `HS CODE ${product.hs}` : ""}`.trim(),
      ]);
      tariffRows.push([
        identifier, containerNumber, c + 1, product.hs,
        randInt(8000, 220000), Math.round(weightKg / containerCount), "Kilograms",
      ]);
    }
  }

  const files: [string, string[], (string | number)[][]][] = [
    ["ams__header_sample.csv", [
      "identifier", "carrier_code", "vessel_country_code", "vessel_name", "port_of_unlading",
      "estimated_arrival_date", "foreign_port_of_lading_qualifier", "foreign_port_of_lading",
      "manifest_quantity", "manifest_unit", "weight", "weight_unit", "record_status_indicator",
      "place_of_receipt", "port_of_destination", "conveyance_id_qualifier", "conveyance_id",
      "mode_of_transportation", "actual_arrival_date",
    ], header],
    ["ams__billgen_sample.csv", ["identifier", "master_bol_number", "house_bol_number", "voyage_number", "bill_type_code"], bill],
    ["ams__shipper_sample.csv", ["identifier", "shipper_party_name", "address_1", "address_2", "city", "state_province", "zip_code", "country_code"], shipperRows],
    ["ams__consignee_sample.csv", ["identifier", "consignee_party_name", "address_1", "address_2", "city", "state_province", "zip_code", "country_code"], consigneeRows],
    ["ams__notifyparty_sample.csv", ["identifier", "notify_party_name", "address_1", "city", "state_province", "zip_code", "country_code"], notifyRows],
    ["ams__cargodesc_sample.csv", ["identifier", "container_number", "description_sequence_number", "piece_count", "description_text"], cargoRows],
    ["ams__container_sample.csv", ["identifier", "container_number", "seal_number_1", "equipment_description_code", "container_length", "container_height", "container_width", "container_type", "load_status", "type_of_service"], containerRows],
    ["ams__tariff_sample.csv", ["identifier", "container_number", "description_sequence_number", "harmonized_number", "harmonized_value", "harmonized_weight", "harmonized_weight_unit"], tariffRows],
  ];

  for (const [name, cols, rows] of files) {
    fs.writeFileSync(path.join(outDir, name), toCsv(cols, rows));
  }

  return {
    shipments: header.length,
    containers: containerRows.length,
    files: files.map(([name]) => name),
  };
}
