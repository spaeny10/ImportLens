// Idempotent DDL applied at client creation. Written by hand (rather than
// drizzle-kit migrations) so the same code path bootstraps both the embedded
// PGlite dev database and a production Postgres.
export const DDL = `
CREATE TABLE IF NOT EXISTS companies (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  normalized_name TEXT NOT NULL,
  address TEXT,
  city TEXT,
  state_province TEXT,
  zip_code TEXT,
  country_code TEXT,
  shipments_as_consignee INTEGER NOT NULL DEFAULT 0,
  shipments_as_shipper INTEGER NOT NULL DEFAULT 0,
  total_weight_kg BIGINT NOT NULL DEFAULT 0,
  first_shipment DATE,
  last_shipment DATE
);
CREATE UNIQUE INDEX IF NOT EXISTS companies_normalized_name_idx ON companies (normalized_name);
CREATE INDEX IF NOT EXISTS companies_name_idx ON companies (name);

CREATE TABLE IF NOT EXISTS shipments (
  id TEXT PRIMARY KEY,
  master_bol_number TEXT,
  house_bol_number TEXT,
  bill_type_code TEXT,
  carrier_code TEXT,
  vessel_name TEXT,
  vessel_country_code TEXT,
  voyage_number TEXT,
  mode_of_transportation TEXT,
  port_of_unlading TEXT,
  foreign_port_of_lading TEXT,
  place_of_receipt TEXT,
  port_of_destination TEXT,
  estimated_arrival_date DATE,
  actual_arrival_date DATE,
  arrival_date DATE NOT NULL,
  manifest_quantity INTEGER,
  manifest_unit TEXT,
  weight_kg BIGINT NOT NULL DEFAULT 0,
  container_count INTEGER NOT NULL DEFAULT 0,
  consignee_name TEXT,
  shipper_name TEXT,
  consignee_company_id INTEGER REFERENCES companies(id),
  shipper_company_id INTEGER REFERENCES companies(id),
  description_summary TEXT,
  hs_numbers TEXT
);
CREATE INDEX IF NOT EXISTS shipments_arrival_idx ON shipments (arrival_date);
CREATE INDEX IF NOT EXISTS shipments_consignee_company_idx ON shipments (consignee_company_id);
CREATE INDEX IF NOT EXISTS shipments_shipper_company_idx ON shipments (shipper_company_id);
CREATE INDEX IF NOT EXISTS shipments_port_unlading_idx ON shipments (port_of_unlading);
CREATE INDEX IF NOT EXISTS shipments_foreign_port_idx ON shipments (foreign_port_of_lading);
CREATE INDEX IF NOT EXISTS shipments_desc_fts_idx ON shipments
  USING GIN (to_tsvector('english', coalesce(description_summary, '')));

CREATE TABLE IF NOT EXISTS shipment_parties (
  id SERIAL PRIMARY KEY,
  shipment_id TEXT NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  name TEXT,
  address TEXT,
  city TEXT,
  state_province TEXT,
  zip_code TEXT,
  country_code TEXT,
  company_id INTEGER REFERENCES companies(id)
);
CREATE INDEX IF NOT EXISTS parties_shipment_idx ON shipment_parties (shipment_id);

CREATE TABLE IF NOT EXISTS cargo_descriptions (
  id SERIAL PRIMARY KEY,
  shipment_id TEXT NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
  container_number TEXT,
  sequence_number INTEGER,
  piece_count INTEGER,
  description TEXT
);
CREATE INDEX IF NOT EXISTS cargodesc_shipment_idx ON cargo_descriptions (shipment_id);

CREATE TABLE IF NOT EXISTS containers (
  id SERIAL PRIMARY KEY,
  shipment_id TEXT NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
  container_number TEXT,
  seal_number TEXT,
  equipment_description TEXT,
  container_type TEXT,
  load_status TEXT,
  type_of_service TEXT
);
CREATE INDEX IF NOT EXISTS containers_shipment_idx ON containers (shipment_id);

CREATE TABLE IF NOT EXISTS tariffs (
  id SERIAL PRIMARY KEY,
  shipment_id TEXT NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
  container_number TEXT,
  hs_number TEXT,
  value BIGINT,
  weight_kg BIGINT
);
CREATE INDEX IF NOT EXISTS tariffs_shipment_idx ON tariffs (shipment_id);
CREATE INDEX IF NOT EXISTS tariffs_hs_idx ON tariffs (hs_number);

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS users_email_idx ON users (email);

CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions (user_id);

CREATE TABLE IF NOT EXISTS saved_searches (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  params JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS saved_searches_user_idx ON saved_searches (user_id);

CREATE TABLE IF NOT EXISTS watchlist (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS watchlist_user_company_idx ON watchlist (user_id, company_id);
`;

// Optional — speeds up fuzzy company-name search when pg_trgm is available.
export const TRGM_DDL = `
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS companies_name_trgm_idx ON companies USING GIN (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS shipments_consignee_trgm_idx ON shipments USING GIN (consignee_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS shipments_shipper_trgm_idx ON shipments USING GIN (shipper_name gin_trgm_ops);
`;
