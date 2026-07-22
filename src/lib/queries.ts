import "server-only";
import { sql, and, eq, gte, lte, ilike, desc, or, type SQL } from "drizzle-orm";
import { getDb, schema } from "../db";

const PAGE_SIZE = 25;

// ---------------------------------------------------------------------------
// Shipment search
// ---------------------------------------------------------------------------
export interface ShipmentSearchParams {
  q?: string; // product description full-text
  consignee?: string;
  shipper?: string;
  hs?: string; // HS code prefix
  port?: string; // US port of unlading
  origin?: string; // foreign port of lading
  vessel?: string; // exact vessel name
  from?: string; // YYYY-MM-DD
  to?: string;
  page?: number;
}

export type ShipmentRow = {
  id: string;
  arrivalDate: string;
  consigneeName: string | null;
  shipperName: string | null;
  consigneeCompanyId: number | null;
  shipperCompanyId: number | null;
  portOfUnlading: string | null;
  foreignPortOfLading: string | null;
  descriptionSummary: string | null;
  weightKg: number;
  containerCount: number;
  carrierCode: string | null;
};

function shipmentConditions(p: ShipmentSearchParams): SQL[] {
  const conds: SQL[] = [];
  const s = schema.shipments;
  if (p.q?.trim()) {
    conds.push(
      sql`to_tsvector('english', coalesce(${s.descriptionSummary}, '')) @@ plainto_tsquery('english', ${p.q.trim()})`
    );
  }
  if (p.consignee?.trim()) conds.push(ilike(s.consigneeName, `%${p.consignee.trim()}%`)!);
  if (p.shipper?.trim()) conds.push(ilike(s.shipperName, `%${p.shipper.trim()}%`)!);
  if (p.hs?.trim()) {
    const prefix = p.hs.trim().replace(/[^0-9]/g, "");
    if (prefix) conds.push(sql`${s.hsNumbers} ~ ${"(^| )" + prefix}`);
  }
  if (p.port?.trim()) conds.push(eq(s.portOfUnlading, p.port.trim()));
  if (p.origin?.trim()) conds.push(eq(s.foreignPortOfLading, p.origin.trim()));
  if (p.vessel?.trim()) conds.push(eq(s.vesselName, p.vessel.trim()));
  if (p.from?.trim()) conds.push(gte(s.arrivalDate, p.from.trim()));
  if (p.to?.trim()) conds.push(lte(s.arrivalDate, p.to.trim()));
  return conds;
}

export async function searchShipments(p: ShipmentSearchParams) {
  const db = await getDb();
  const s = schema.shipments;
  const conds = shipmentConditions(p);
  const where = conds.length ? and(...conds) : undefined;
  const page = Math.max(1, p.page ?? 1);

  const [rows, totalRes] = await Promise.all([
    db
      .select({
        id: s.id,
        arrivalDate: s.arrivalDate,
        consigneeName: s.consigneeName,
        shipperName: s.shipperName,
        consigneeCompanyId: s.consigneeCompanyId,
        shipperCompanyId: s.shipperCompanyId,
        portOfUnlading: s.portOfUnlading,
        foreignPortOfLading: s.foreignPortOfLading,
        descriptionSummary: s.descriptionSummary,
        weightKg: s.weightKg,
        containerCount: s.containerCount,
        carrierCode: s.carrierCode,
      })
      .from(s)
      .where(where)
      .orderBy(desc(s.arrivalDate), desc(s.id))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    db.select({ count: sql<number>`count(*)::int` }).from(s).where(where),
  ]);

  const total = totalRes[0]?.count ?? 0;
  return { rows: rows as ShipmentRow[], total, page, pageSize: PAGE_SIZE };
}

export async function getShipment(id: string) {
  const db = await getDb();
  const [shipment] = await db
    .select()
    .from(schema.shipments)
    .where(eq(schema.shipments.id, id))
    .limit(1);
  if (!shipment) return null;

  const [parties, cargo, conts, tariffLines] = await Promise.all([
    db.select().from(schema.shipmentParties).where(eq(schema.shipmentParties.shipmentId, id)),
    db
      .select()
      .from(schema.cargoDescriptions)
      .where(eq(schema.cargoDescriptions.shipmentId, id))
      .orderBy(schema.cargoDescriptions.sequenceNumber),
    db.select().from(schema.containers).where(eq(schema.containers.shipmentId, id)),
    db.select().from(schema.tariffs).where(eq(schema.tariffs.shipmentId, id)),
  ]);
  return { shipment, parties, cargo, containers: conts, tariffs: tariffLines };
}

export async function getPortOptions() {
  const db = await getDb();
  const [us, foreign] = await Promise.all([
    db.execute(
      sql`SELECT DISTINCT port_of_unlading p FROM shipments WHERE port_of_unlading IS NOT NULL ORDER BY 1`
    ),
    db.execute(
      sql`SELECT DISTINCT foreign_port_of_lading p FROM shipments WHERE foreign_port_of_lading IS NOT NULL ORDER BY 1`
    ),
  ]);
  return {
    usPorts: (us.rows as { p: string }[]).map((r) => r.p),
    foreignPorts: (foreign.rows as { p: string }[]).map((r) => r.p),
  };
}

// ---------------------------------------------------------------------------
// Companies
// ---------------------------------------------------------------------------
export interface CompanySearchParams {
  q?: string;
  role?: "importer" | "supplier" | "all";
  page?: number;
}

export async function searchCompanies(p: CompanySearchParams) {
  const db = await getDb();
  const c = schema.companies;
  const conds: SQL[] = [];
  if (p.q?.trim()) conds.push(ilike(c.name, `%${p.q.trim()}%`)!);
  if (p.role === "importer") conds.push(gte(c.shipmentsAsConsignee, 1));
  if (p.role === "supplier") conds.push(gte(c.shipmentsAsShipper, 1));
  const where = conds.length ? and(...conds) : undefined;
  const page = Math.max(1, p.page ?? 1);

  const [rows, totalRes] = await Promise.all([
    db
      .select()
      .from(c)
      .where(where)
      .orderBy(desc(sql`${c.shipmentsAsConsignee} + ${c.shipmentsAsShipper}`))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    db.select({ count: sql<number>`count(*)::int` }).from(c).where(where),
  ]);
  return { rows, total: totalRes[0]?.count ?? 0, page, pageSize: PAGE_SIZE };
}

export async function getCompanyProfile(id: number) {
  const db = await getDb();
  const [company] = await db
    .select()
    .from(schema.companies)
    .where(eq(schema.companies.id, id))
    .limit(1);
  if (!company) return null;

  const [monthly, partners, topHs, recent] = await Promise.all([
    db.execute(sql`
      SELECT to_char(arrival_date, 'YYYY-MM') AS month,
             count(*)::int AS shipments,
             sum(weight_kg)::bigint AS weight_kg
      FROM shipments
      WHERE consignee_company_id = ${id} OR shipper_company_id = ${id}
      GROUP BY 1 ORDER BY 1
    `),
    db.execute(sql`
      SELECT c.id, c.name, c.country_code, count(*)::int AS shipments
      FROM shipments s
      JOIN companies c
        ON c.id = CASE WHEN s.consignee_company_id = ${id} THEN s.shipper_company_id
                       ELSE s.consignee_company_id END
      WHERE s.consignee_company_id = ${id} OR s.shipper_company_id = ${id}
      GROUP BY c.id, c.name, c.country_code
      ORDER BY shipments DESC
      LIMIT 10
    `),
    db.execute(sql`
      SELECT substring(t.hs_number, 1, 2) AS chapter, count(DISTINCT s.id)::int AS shipments
      FROM shipments s JOIN tariffs t ON t.shipment_id = s.id
      WHERE s.consignee_company_id = ${id} OR s.shipper_company_id = ${id}
      GROUP BY 1 ORDER BY shipments DESC LIMIT 8
    `),
    db
      .select({
        id: schema.shipments.id,
        arrivalDate: schema.shipments.arrivalDate,
        consigneeName: schema.shipments.consigneeName,
        shipperName: schema.shipments.shipperName,
        portOfUnlading: schema.shipments.portOfUnlading,
        foreignPortOfLading: schema.shipments.foreignPortOfLading,
        descriptionSummary: schema.shipments.descriptionSummary,
        weightKg: schema.shipments.weightKg,
        containerCount: schema.shipments.containerCount,
      })
      .from(schema.shipments)
      .where(
        or(
          eq(schema.shipments.consigneeCompanyId, id),
          eq(schema.shipments.shipperCompanyId, id)
        )
      )
      .orderBy(desc(schema.shipments.arrivalDate))
      .limit(10),
  ]);

  return {
    company,
    monthly: monthly.rows as { month: string; shipments: number; weight_kg: number }[],
    partners: partners.rows as { id: number; name: string; country_code: string | null; shipments: number }[],
    topHs: topHs.rows as { chapter: string; shipments: number }[],
    recent,
  };
}

// ---------------------------------------------------------------------------
// Vessels
// ---------------------------------------------------------------------------
export async function getVesselStats(name: string) {
  const db = await getDb();
  const s = schema.shipments;
  const [totals, routes, recent] = await Promise.all([
    db.execute(sql`
      SELECT count(*)::int AS shipments,
             sum(weight_kg)::bigint AS weight_kg,
             sum(container_count)::int AS containers,
             max(arrival_date)::text AS last_arrival,
             mode() WITHIN GROUP (ORDER BY carrier_code) AS carrier_code
      FROM shipments WHERE vessel_name = ${name}
    `),
    db.execute(sql`
      SELECT foreign_port_of_lading AS origin, port_of_unlading AS destination,
             count(*)::int AS shipments
      FROM shipments WHERE vessel_name = ${name}
      GROUP BY 1, 2 ORDER BY 3 DESC LIMIT 8
    `),
    db
      .select({
        id: s.id,
        arrivalDate: s.arrivalDate,
        consigneeName: s.consigneeName,
        shipperName: s.shipperName,
        consigneeCompanyId: s.consigneeCompanyId,
        shipperCompanyId: s.shipperCompanyId,
        portOfUnlading: s.portOfUnlading,
        foreignPortOfLading: s.foreignPortOfLading,
        descriptionSummary: s.descriptionSummary,
        weightKg: s.weightKg,
        containerCount: s.containerCount,
        carrierCode: s.carrierCode,
      })
      .from(s)
      .where(eq(s.vesselName, name))
      .orderBy(desc(s.arrivalDate))
      .limit(10),
  ]);
  const t = totals.rows[0] as {
    shipments: number;
    weight_kg: number | null;
    containers: number | null;
    last_arrival: string | null;
    carrier_code: string | null;
  };
  if (!t || t.shipments === 0) return null;
  return {
    totals: t,
    routes: routes.rows as { origin: string | null; destination: string | null; shipments: number }[],
    recent: recent as ShipmentRow[],
  };
}

export async function getPortStats(port: string) {
  const db = await getDb();
  const [totals, topConsignees, monthly] = await Promise.all([
    db.execute(sql`
      SELECT count(*)::int AS shipments,
             sum(weight_kg)::bigint AS weight_kg,
             sum(container_count)::int AS containers,
             count(*) FILTER (
               WHERE arrival_date >= (SELECT max(arrival_date) FROM shipments) - INTERVAL '60 days'
             )::int AS recent_shipments
      FROM shipments WHERE port_of_unlading = ${port}
    `),
    db.execute(sql`
      SELECT c.id, c.name, count(*)::int AS shipments
      FROM shipments s JOIN companies c ON c.id = s.consignee_company_id
      WHERE s.port_of_unlading = ${port}
      GROUP BY c.id, c.name ORDER BY shipments DESC LIMIT 8
    `),
    db.execute(sql`
      SELECT to_char(arrival_date, 'YYYY-MM') AS month, count(*)::int AS shipments,
             sum(weight_kg)::bigint AS weight_kg
      FROM shipments WHERE port_of_unlading = ${port}
      GROUP BY 1 ORDER BY 1
    `),
  ]);
  return {
    totals: totals.rows[0] as {
      shipments: number;
      weight_kg: number | null;
      containers: number | null;
      recent_shipments: number;
    },
    topConsignees: topConsignees.rows as { id: number; name: string; shipments: number }[],
    monthly: monthly.rows as { month: string; shipments: number; weight_kg: number }[],
  };
}

// ---------------------------------------------------------------------------
// Dashboard / analytics
// ---------------------------------------------------------------------------
export async function getDashboardStats() {
  const db = await getDb();
  const [totals, monthly, topImporters, topSuppliers, topPorts, topOrigins, topChapters] =
    await Promise.all([
      db.execute(sql`
        SELECT count(*)::int AS shipments,
               sum(weight_kg)::bigint AS weight_kg,
               sum(container_count)::int AS containers,
               (SELECT count(*)::int FROM companies) AS companies,
               min(arrival_date)::text AS first_date,
               max(arrival_date)::text AS last_date
        FROM shipments
      `),
      db.execute(sql`
        SELECT to_char(arrival_date, 'YYYY-MM') AS month,
               count(*)::int AS shipments,
               sum(weight_kg)::bigint AS weight_kg
        FROM shipments GROUP BY 1 ORDER BY 1
      `),
      db.execute(sql`
        SELECT id, name, shipments_as_consignee AS shipments FROM companies
        WHERE shipments_as_consignee > 0
        ORDER BY shipments_as_consignee DESC LIMIT 10
      `),
      db.execute(sql`
        SELECT id, name, country_code, shipments_as_shipper AS shipments FROM companies
        WHERE shipments_as_shipper > 0
        ORDER BY shipments_as_shipper DESC LIMIT 10
      `),
      db.execute(sql`
        SELECT port_of_unlading AS name, count(*)::int AS shipments
        FROM shipments WHERE port_of_unlading IS NOT NULL
        GROUP BY 1 ORDER BY 2 DESC LIMIT 10
      `),
      db.execute(sql`
        SELECT foreign_port_of_lading AS name, count(*)::int AS shipments
        FROM shipments WHERE foreign_port_of_lading IS NOT NULL
        GROUP BY 1 ORDER BY 2 DESC LIMIT 10
      `),
      db.execute(sql`
        SELECT substring(hs_number, 1, 2) AS chapter, count(DISTINCT shipment_id)::int AS shipments
        FROM tariffs WHERE hs_number IS NOT NULL
        GROUP BY 1 ORDER BY 2 DESC LIMIT 10
      `),
    ]);

  return {
    totals: totals.rows[0] as {
      shipments: number;
      weight_kg: number;
      containers: number;
      companies: number;
      first_date: string;
      last_date: string;
    },
    monthly: monthly.rows as { month: string; shipments: number; weight_kg: number }[],
    topImporters: topImporters.rows as { id: number; name: string; shipments: number }[],
    topSuppliers: topSuppliers.rows as { id: number; name: string; country_code: string | null; shipments: number }[],
    topPorts: topPorts.rows as { name: string; shipments: number }[],
    topOrigins: topOrigins.rows as { name: string; shipments: number }[],
    topChapters: topChapters.rows as { chapter: string; shipments: number }[],
  };
}

// ---------------------------------------------------------------------------
// BI analytics dashboard (filterable)
// ---------------------------------------------------------------------------
export interface BiFilter {
  port?: string;
  rangeDays?: number; // window ending at the dataset's latest arrival date
}

function biWhere(f: BiFilter): SQL {
  const conds: SQL[] = [sql`1=1`];
  if (f.port) conds.push(sql`s.port_of_unlading = ${f.port}`);
  if (f.rangeDays) {
    conds.push(
      sql`s.arrival_date >= (SELECT max(arrival_date) FROM shipments) - make_interval(days => ${f.rangeDays})`
    );
  }
  return sql.join(conds, sql` AND `);
}

export async function getBiAnalytics(f: BiFilter) {
  const db = await getDb();
  const where = biWhere(f);

  const [kpis, byCarrier, byChapter, heatmap, topImporters, portShares, monthly, maxDate] =
    await Promise.all([
      db.execute(sql`
        SELECT count(*)::int AS shipments,
               coalesce(sum(s.container_count), 0)::int AS containers,
               coalesce(sum(s.weight_kg), 0)::bigint AS weight_kg,
               count(DISTINCT s.consignee_company_id)::int AS importers,
               count(DISTINCT s.vessel_name)::int AS vessels
        FROM shipments s WHERE ${where}
      `),
      db.execute(sql`
        SELECT s.carrier_code AS carrier, count(*)::int AS shipments
        FROM shipments s WHERE ${where} AND s.carrier_code IS NOT NULL
        GROUP BY 1 ORDER BY 2 DESC
      `),
      db.execute(sql`
        SELECT substring(t.hs_number, 1, 2) AS chapter, count(DISTINCT s.id)::int AS shipments
        FROM shipments s JOIN tariffs t ON t.shipment_id = s.id
        WHERE ${where} AND t.hs_number IS NOT NULL
        GROUP BY 1 ORDER BY 2 DESC LIMIT 12
      `),
      db.execute(sql`
        WITH top_chapters AS (
          SELECT substring(t.hs_number, 1, 2) AS chapter
          FROM shipments s JOIN tariffs t ON t.shipment_id = s.id
          WHERE ${where} AND t.hs_number IS NOT NULL
          GROUP BY 1 ORDER BY count(DISTINCT s.id) DESC LIMIT 7
        )
        SELECT s.port_of_unlading AS port, substring(t.hs_number, 1, 2) AS chapter,
               count(DISTINCT s.id)::int AS shipments
        FROM shipments s JOIN tariffs t ON t.shipment_id = s.id
        WHERE ${where} AND substring(t.hs_number, 1, 2) IN (SELECT chapter FROM top_chapters)
        GROUP BY 1, 2
      `),
      db.execute(sql`
        SELECT c.id, c.name, count(*)::int AS shipments
        FROM shipments s JOIN companies c ON c.id = s.consignee_company_id
        WHERE ${where}
        GROUP BY c.id, c.name ORDER BY shipments DESC LIMIT 8
      `),
      db.execute(sql`
        SELECT s.port_of_unlading AS port, count(*)::int AS shipments
        FROM shipments s WHERE ${where} AND s.port_of_unlading IS NOT NULL
        GROUP BY 1 ORDER BY 2 DESC LIMIT 5
      `),
      db.execute(sql`
        SELECT to_char(s.arrival_date, 'YYYY-MM') AS month, count(*)::int AS shipments,
               sum(s.weight_kg)::bigint AS weight_kg
        FROM shipments s WHERE ${where}
        GROUP BY 1 ORDER BY 1
      `),
      db.execute(sql`SELECT max(arrival_date)::text AS max_date FROM shipments`),
    ]);

  return {
    kpis: kpis.rows[0] as {
      shipments: number;
      containers: number;
      weight_kg: number;
      importers: number;
      vessels: number;
    },
    byCarrier: byCarrier.rows as { carrier: string; shipments: number }[],
    byChapter: byChapter.rows as { chapter: string; shipments: number }[],
    heatmap: heatmap.rows as { port: string; chapter: string; shipments: number }[],
    topImporters: topImporters.rows as { id: number; name: string; shipments: number }[],
    portShares: portShares.rows as { port: string; shipments: number }[],
    monthly: monthly.rows as { month: string; shipments: number; weight_kg: number }[],
    maxDate: (maxDate.rows[0] as { max_date: string | null }).max_date,
  };
}

// ---------------------------------------------------------------------------
// Saved searches & watchlist
// ---------------------------------------------------------------------------
export async function getSavedSearches(userId: number) {
  const db = await getDb();
  return db
    .select()
    .from(schema.savedSearches)
    .where(eq(schema.savedSearches.userId, userId))
    .orderBy(desc(schema.savedSearches.createdAt));
}

export async function getWatchlist(userId: number) {
  const db = await getDb();
  return db
    .select({
      id: schema.watchlist.id,
      companyId: schema.companies.id,
      name: schema.companies.name,
      countryCode: schema.companies.countryCode,
      shipmentsAsConsignee: schema.companies.shipmentsAsConsignee,
      shipmentsAsShipper: schema.companies.shipmentsAsShipper,
      lastShipment: schema.companies.lastShipment,
      createdAt: schema.watchlist.createdAt,
    })
    .from(schema.watchlist)
    .innerJoin(schema.companies, eq(schema.companies.id, schema.watchlist.companyId))
    .where(eq(schema.watchlist.userId, userId))
    .orderBy(desc(schema.watchlist.createdAt));
}

export async function isWatched(userId: number, companyId: number) {
  const db = await getDb();
  const rows = await db
    .select({ id: schema.watchlist.id })
    .from(schema.watchlist)
    .where(and(eq(schema.watchlist.userId, userId), eq(schema.watchlist.companyId, companyId)))
    .limit(1);
  return rows.length > 0;
}
