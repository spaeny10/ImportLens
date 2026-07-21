import fs from "fs";
import path from "path";
import { sql } from "drizzle-orm";
import { inArray } from "drizzle-orm";
import { parseCsv } from "./csv";
import { isPlaceholderName, normalizeCompanyName } from "./normalize";
import { getDb, schema } from "../../db";

// Ingests a directory of CBP AMS FOIA vessel-manifest CSV extracts:
//   ams__header_*.csv  ams__bill*_*.csv    ams__shipper_*.csv
//   ams__consignee_*.csv  ams__notifyparty_*.csv  ams__cargodesc_*.csv
//   ams__container_*.csv  ams__tariff_*.csv
// (marksnumbers / hazmat files are ignored.)
// All tables are keyed by the AMS `identifier` column.

type Row = Record<string, string>;

const FILE_KINDS = [
  "header",
  "cargodesc",
  "container",
  "notifyparty",
  "shipper",
  "consignee",
  "tariff",
  "bill",
] as const;
type FileKind = (typeof FILE_KINDS)[number];

function classifyFile(name: string): FileKind | null {
  const n = name.toLowerCase();
  if (!n.endsWith(".csv")) return null;
  for (const kind of FILE_KINDS) {
    if (n.includes(kind)) return kind;
  }
  return null;
}

function parseDate(s: string | undefined): string | null {
  if (!s) return null;
  const t = s.trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(t)) return t.slice(0, 10);
  const m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) return `${m[3]}-${m[1].padStart(2, "0")}-${m[2].padStart(2, "0")}`;
  return null;
}

function parseIntSafe(s: string | undefined): number | null {
  if (!s) return null;
  const n = parseInt(s.replace(/[^\d-]/g, ""), 10);
  return Number.isFinite(n) ? n : null;
}

function toKg(weight: string | undefined, unit: string | undefined): number {
  const w = parseFloat((weight ?? "").replace(/[^\d.]/g, ""));
  if (!Number.isFinite(w)) return 0;
  const u = (unit ?? "").trim().toLowerCase();
  if (u.startsWith("l") || u.startsWith("p")) return Math.round(w * 0.453592);
  return Math.round(w);
}

function groupBy(rows: Row[], key = "identifier"): Map<string, Row[]> {
  const map = new Map<string, Row[]>();
  for (const r of rows) {
    const k = r[key];
    if (!k) continue;
    const arr = map.get(k);
    if (arr) arr.push(r);
    else map.set(k, [r]);
  }
  return map;
}

function partyFields(r: Row, role: string) {
  const name = r[`${role}_party_name`] ?? r["party_name"] ?? r["name"] ?? "";
  const address = [r["address_1"], r["address_2"], r["address_3"], r["address_4"]]
    .filter(Boolean)
    .join(", ");
  return {
    name: name || null,
    address: address || null,
    city: r["city"] || null,
    stateProvince: r["state_province"] || null,
    zipCode: r["zip_code"] || null,
    countryCode: r["country_code"] || null,
  };
}

async function chunked<T>(rows: T[], size: number, fn: (chunk: T[]) => Promise<void>) {
  for (let i = 0; i < rows.length; i += size) {
    await fn(rows.slice(i, i + size));
  }
}

export interface IngestResult {
  files: number;
  shipmentsInserted: number;
  shipmentsSkipped: number;
  companies: number;
}

export async function ingestDirectory(dir: string): Promise<IngestResult> {
  const db = await getDb();

  const byKind = new Map<FileKind, Row[]>();
  let fileCount = 0;
  for (const f of fs.readdirSync(dir)) {
    const kind = classifyFile(f);
    if (!kind) continue;
    fileCount++;
    const rows = parseCsv(fs.readFileSync(path.join(dir, f), "utf8"));
    byKind.set(kind, [...(byKind.get(kind) ?? []), ...rows]);
  }

  const headers = byKind.get("header") ?? [];
  if (headers.length === 0) {
    return { files: fileCount, shipmentsInserted: 0, shipmentsSkipped: 0, companies: 0 };
  }

  const bills = groupBy(byKind.get("bill") ?? []);
  const shippers = groupBy(byKind.get("shipper") ?? []);
  const consignees = groupBy(byKind.get("consignee") ?? []);
  const notifies = groupBy(byKind.get("notifyparty") ?? []);
  const cargodescs = groupBy(byKind.get("cargodesc") ?? []);
  const containerRows = groupBy(byKind.get("container") ?? []);
  const tariffRows = groupBy(byKind.get("tariff") ?? []);

  // ------------------------------------------------------------------
  // 1. Upsert canonical companies for every shipper/consignee name seen
  // ------------------------------------------------------------------
  const companyByKey = new Map<string, { id?: number; row: ReturnType<typeof partyFields> }>();
  const collectCompany = (r: Row, role: string) => {
    const p = partyFields(r, role);
    if (isPlaceholderName(p.name)) return;
    const key = normalizeCompanyName(p.name!);
    if (!key) return;
    if (!companyByKey.has(key)) companyByKey.set(key, { row: p });
  };
  for (const rows of shippers.values()) for (const r of rows) collectCompany(r, "shipper");
  for (const rows of consignees.values()) for (const r of rows) collectCompany(r, "consignee");

  const companyEntries = [...companyByKey.entries()];
  await chunked(companyEntries, 300, async (chunk) => {
    const inserted = await db
      .insert(schema.companies)
      .values(
        chunk.map(([key, { row }]) => ({
          name: row.name!,
          normalizedName: key,
          address: row.address,
          city: row.city,
          stateProvince: row.stateProvince,
          zipCode: row.zipCode,
          countryCode: row.countryCode,
        }))
      )
      .onConflictDoUpdate({
        target: schema.companies.normalizedName,
        set: { normalizedName: sql`excluded.normalized_name` }, // no-op update so RETURNING covers conflicts
      })
      .returning({ id: schema.companies.id, normalizedName: schema.companies.normalizedName });
    for (const c of inserted) {
      const entry = companyByKey.get(c.normalizedName);
      if (entry) entry.id = c.id;
    }
  });

  const companyId = (name: string | null): number | null => {
    if (isPlaceholderName(name)) return null;
    return companyByKey.get(normalizeCompanyName(name!))?.id ?? null;
  };

  // ------------------------------------------------------------------
  // 2. Build shipment rows, skipping identifiers already in the DB
  // ------------------------------------------------------------------
  const incomingIds = headers.map((h) => h["identifier"]).filter(Boolean);
  const existing = new Set<string>();
  await chunked(incomingIds, 1000, async (chunk) => {
    const found = await db
      .select({ id: schema.shipments.id })
      .from(schema.shipments)
      .where(inArray(schema.shipments.id, chunk));
    for (const f of found) existing.add(f.id);
  });

  type NewShipment = typeof schema.shipments.$inferInsert;
  type NewParty = typeof schema.shipmentParties.$inferInsert;
  type NewCargo = typeof schema.cargoDescriptions.$inferInsert;
  type NewContainer = typeof schema.containers.$inferInsert;
  type NewTariff = typeof schema.tariffs.$inferInsert;

  const shipmentRows: NewShipment[] = [];
  const partyRowsOut: NewParty[] = [];
  const cargoRowsOut: NewCargo[] = [];
  const containerRowsOut: NewContainer[] = [];
  const tariffRowsOut: NewTariff[] = [];
  let skipped = 0;
  const seen = new Set<string>();

  for (const h of headers) {
    const id = h["identifier"];
    if (!id || existing.has(id) || seen.has(id)) {
      skipped++;
      continue;
    }
    seen.add(id);

    const bill = bills.get(id)?.[0];
    const shipper = shippers.get(id)?.[0];
    const consignee = consignees.get(id)?.[0];
    const eta = parseDate(h["estimated_arrival_date"]);
    const ata = parseDate(h["actual_arrival_date"]);
    const arrival = ata ?? eta;
    if (!arrival) {
      skipped++;
      continue;
    }

    const cargo = cargodescs.get(id) ?? [];
    const conts = containerRows.get(id) ?? [];
    const tars = tariffRows.get(id) ?? [];

    const shipperP = shipper ? partyFields(shipper, "shipper") : null;
    const consigneeP = consignee ? partyFields(consignee, "consignee") : null;

    const descSummary = cargo
      .map((c) => c["description_text"] ?? c["description"] ?? "")
      .filter(Boolean)
      .join(" | ");
    const hsNumbers = [...new Set(tars.map((t) => t["harmonized_number"]).filter(Boolean))].join(" ");

    shipmentRows.push({
      id,
      masterBolNumber: bill?.["master_bol_number"] || null,
      houseBolNumber: bill?.["house_bol_number"] || null,
      billTypeCode: bill?.["bill_type_code"] || null,
      carrierCode: h["carrier_code"] || null,
      vesselName: h["vessel_name"] || null,
      vesselCountryCode: h["vessel_country_code"] || null,
      voyageNumber: bill?.["voyage_number"] || null,
      modeOfTransportation: h["mode_of_transportation"] || null,
      portOfUnlading: h["port_of_unlading"] || null,
      foreignPortOfLading: h["foreign_port_of_lading"] || null,
      placeOfReceipt: h["place_of_receipt"] || null,
      portOfDestination: h["port_of_destination"] || null,
      estimatedArrivalDate: eta,
      actualArrivalDate: ata,
      arrivalDate: arrival,
      manifestQuantity: parseIntSafe(h["manifest_quantity"]),
      manifestUnit: h["manifest_unit"] || null,
      weightKg: toKg(h["weight"], h["weight_unit"]),
      containerCount: new Set(conts.map((c) => c["container_number"]).filter(Boolean)).size,
      consigneeName: consigneeP?.name ?? null,
      shipperName: shipperP?.name ?? null,
      consigneeCompanyId: companyId(consigneeP?.name ?? null),
      shipperCompanyId: companyId(shipperP?.name ?? null),
      descriptionSummary: descSummary || null,
      hsNumbers: hsNumbers || null,
    });

    if (shipperP) {
      partyRowsOut.push({
        shipmentId: id, role: "shipper", ...shipperP,
        companyId: companyId(shipperP.name),
      });
    }
    if (consigneeP) {
      partyRowsOut.push({
        shipmentId: id, role: "consignee", ...consigneeP,
        companyId: companyId(consigneeP.name),
      });
    }
    for (const n of notifies.get(id) ?? []) {
      const p = partyFields(n, "notify");
      if (!p.name) continue;
      partyRowsOut.push({ shipmentId: id, role: "notify", ...p, companyId: null });
    }
    for (const c of cargo) {
      cargoRowsOut.push({
        shipmentId: id,
        containerNumber: c["container_number"] || null,
        sequenceNumber: parseIntSafe(c["description_sequence_number"]),
        pieceCount: parseIntSafe(c["piece_count"]),
        description: c["description_text"] || c["description"] || null,
      });
    }
    for (const c of conts) {
      containerRowsOut.push({
        shipmentId: id,
        containerNumber: c["container_number"] || null,
        sealNumber: c["seal_number_1"] || c["seal_number"] || null,
        equipmentDescription: c["equipment_description_code"] || null,
        containerType: c["container_type"] || null,
        loadStatus: c["load_status"] || null,
        typeOfService: c["type_of_service"] || null,
      });
    }
    for (const t of tars) {
      tariffRowsOut.push({
        shipmentId: id,
        containerNumber: t["container_number"] || null,
        hsNumber: t["harmonized_number"] || null,
        value: parseIntSafe(t["harmonized_value"]),
        weightKg: toKg(t["harmonized_weight"], t["harmonized_weight_unit"]),
      });
    }
  }

  // ------------------------------------------------------------------
  // 3. Insert everything in chunks
  // ------------------------------------------------------------------
  await chunked(shipmentRows, 300, async (c) => {
    await db.insert(schema.shipments).values(c).onConflictDoNothing();
  });
  await chunked(partyRowsOut, 400, async (c) => {
    await db.insert(schema.shipmentParties).values(c);
  });
  await chunked(cargoRowsOut, 400, async (c) => {
    await db.insert(schema.cargoDescriptions).values(c);
  });
  await chunked(containerRowsOut, 400, async (c) => {
    await db.insert(schema.containers).values(c);
  });
  await chunked(tariffRowsOut, 400, async (c) => {
    await db.insert(schema.tariffs).values(c);
  });

  // ------------------------------------------------------------------
  // 4. Refresh denormalized company stats
  // ------------------------------------------------------------------
  await db.execute(sql`
    UPDATE companies SET
      shipments_as_consignee = coalesce(a.cons, 0),
      shipments_as_shipper = coalesce(a.ship, 0),
      total_weight_kg = coalesce(a.wt, 0),
      first_shipment = a.first_s,
      last_shipment = a.last_s
    FROM (
      SELECT company_id,
             count(*) FILTER (WHERE role = 'consignee') AS cons,
             count(*) FILTER (WHERE role = 'shipper') AS ship,
             sum(s.weight_kg) AS wt,
             min(s.arrival_date) AS first_s,
             max(s.arrival_date) AS last_s
      FROM shipment_parties p
      JOIN shipments s ON s.id = p.shipment_id
      WHERE p.company_id IS NOT NULL
      GROUP BY company_id
    ) a
    WHERE companies.id = a.company_id
  `);

  return {
    files: fileCount,
    shipmentsInserted: shipmentRows.length,
    shipmentsSkipped: skipped,
    companies: companyByKey.size,
  };
}
