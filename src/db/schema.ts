import {
  pgTable,
  serial,
  text,
  integer,
  bigint,
  date,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

// ---------------------------------------------------------------------------
// Canonical companies, derived from raw AMS party records during ingest
// ---------------------------------------------------------------------------
export const companies = pgTable(
  "companies",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    normalizedName: text("normalized_name").notNull(),
    address: text("address"),
    city: text("city"),
    stateProvince: text("state_province"),
    zipCode: text("zip_code"),
    countryCode: text("country_code"),
    shipmentsAsConsignee: integer("shipments_as_consignee").notNull().default(0),
    shipmentsAsShipper: integer("shipments_as_shipper").notNull().default(0),
    totalWeightKg: bigint("total_weight_kg", { mode: "number" }).notNull().default(0),
    firstShipment: date("first_shipment"),
    lastShipment: date("last_shipment"),
  },
  (t) => [
    uniqueIndex("companies_normalized_name_idx").on(t.normalizedName),
    index("companies_name_idx").on(t.name),
  ]
);

// ---------------------------------------------------------------------------
// Shipments — one row per bill of lading (AMS "header" + "bill" records)
// ---------------------------------------------------------------------------
export const shipments = pgTable(
  "shipments",
  {
    id: text("id").primaryKey(), // AMS identifier
    masterBolNumber: text("master_bol_number"),
    houseBolNumber: text("house_bol_number"),
    billTypeCode: text("bill_type_code"), // Master / House / Simple
    carrierCode: text("carrier_code"), // SCAC
    vesselName: text("vessel_name"),
    vesselCountryCode: text("vessel_country_code"),
    voyageNumber: text("voyage_number"),
    modeOfTransportation: text("mode_of_transportation"),
    portOfUnlading: text("port_of_unlading"),
    foreignPortOfLading: text("foreign_port_of_lading"),
    placeOfReceipt: text("place_of_receipt"),
    portOfDestination: text("port_of_destination"),
    estimatedArrivalDate: date("estimated_arrival_date"),
    actualArrivalDate: date("actual_arrival_date"),
    arrivalDate: date("arrival_date").notNull(), // actual ?? estimated, for querying
    manifestQuantity: integer("manifest_quantity"),
    manifestUnit: text("manifest_unit"),
    weightKg: bigint("weight_kg", { mode: "number" }).notNull().default(0),
    containerCount: integer("container_count").notNull().default(0),
    consigneeName: text("consignee_name"),
    shipperName: text("shipper_name"),
    consigneeCompanyId: integer("consignee_company_id").references(() => companies.id),
    shipperCompanyId: integer("shipper_company_id").references(() => companies.id),
    descriptionSummary: text("description_summary"), // concatenated cargo descriptions, for FTS
    hsNumbers: text("hs_numbers"), // space-separated HS codes, for prefix search
  },
  (t) => [
    index("shipments_arrival_idx").on(t.arrivalDate),
    index("shipments_consignee_company_idx").on(t.consigneeCompanyId),
    index("shipments_shipper_company_idx").on(t.shipperCompanyId),
    index("shipments_port_unlading_idx").on(t.portOfUnlading),
    index("shipments_foreign_port_idx").on(t.foreignPortOfLading),
  ]
);

// ---------------------------------------------------------------------------
// Raw AMS party records (shipper / consignee / notify party per BOL)
// ---------------------------------------------------------------------------
export const shipmentParties = pgTable(
  "shipment_parties",
  {
    id: serial("id").primaryKey(),
    shipmentId: text("shipment_id")
      .notNull()
      .references(() => shipments.id, { onDelete: "cascade" }),
    role: text("role").notNull(), // 'shipper' | 'consignee' | 'notify'
    name: text("name"),
    address: text("address"),
    city: text("city"),
    stateProvince: text("state_province"),
    zipCode: text("zip_code"),
    countryCode: text("country_code"),
    companyId: integer("company_id").references(() => companies.id),
  },
  (t) => [index("parties_shipment_idx").on(t.shipmentId)]
);

export const cargoDescriptions = pgTable(
  "cargo_descriptions",
  {
    id: serial("id").primaryKey(),
    shipmentId: text("shipment_id")
      .notNull()
      .references(() => shipments.id, { onDelete: "cascade" }),
    containerNumber: text("container_number"),
    sequenceNumber: integer("sequence_number"),
    pieceCount: integer("piece_count"),
    description: text("description"),
  },
  (t) => [index("cargodesc_shipment_idx").on(t.shipmentId)]
);

export const containers = pgTable(
  "containers",
  {
    id: serial("id").primaryKey(),
    shipmentId: text("shipment_id")
      .notNull()
      .references(() => shipments.id, { onDelete: "cascade" }),
    containerNumber: text("container_number"),
    sealNumber: text("seal_number"),
    equipmentDescription: text("equipment_description"),
    containerType: text("container_type"),
    loadStatus: text("load_status"),
    typeOfService: text("type_of_service"),
  },
  (t) => [index("containers_shipment_idx").on(t.shipmentId)]
);

export const tariffs = pgTable(
  "tariffs",
  {
    id: serial("id").primaryKey(),
    shipmentId: text("shipment_id")
      .notNull()
      .references(() => shipments.id, { onDelete: "cascade" }),
    containerNumber: text("container_number"),
    hsNumber: text("hs_number"),
    value: bigint("value", { mode: "number" }),
    weightKg: bigint("weight_kg", { mode: "number" }),
  },
  (t) => [
    index("tariffs_shipment_idx").on(t.shipmentId),
    index("tariffs_hs_idx").on(t.hsNumber),
  ]
);

// ---------------------------------------------------------------------------
// App tables
// ---------------------------------------------------------------------------
export const users = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    email: text("email").notNull(),
    name: text("name").notNull(),
    passwordHash: text("password_hash").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("users_email_idx").on(t.email)]
);

export const sessions = pgTable(
  "sessions",
  {
    token: text("token").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (t) => [index("sessions_user_idx").on(t.userId)]
);

export const savedSearches = pgTable(
  "saved_searches",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    params: jsonb("params").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("saved_searches_user_idx").on(t.userId)]
);

export const watchlist = pgTable(
  "watchlist",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    companyId: integer("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("watchlist_user_company_idx").on(t.userId, t.companyId)]
);
