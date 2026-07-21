# ImportLens

A full-stack U.S. import trade-intelligence application in the style of
ImportGenius / Panjiva / Datamyne, built on CBP AMS (Automated Manifest System)
bill-of-lading data.

**Stack:** Next.js (App Router) · TypeScript · Tailwind · Drizzle ORM ·
PostgreSQL (embedded [PGlite](https://pglite.dev/) in dev, real Postgres in
production) · Recharts.

## Quick start

```bash
npm install
npm run seed     # generates sample AMS FOIA files + ingests them + creates demo user
npm run dev      # http://localhost:3000
```

Demo login: `demo@importapp.dev` / `demo1234`

> PGlite is single-process: run `npm run seed` / `npm run ingest` while the dev
> server is **stopped** (or restart it afterwards).

## Features

- **Shipment search** — full-text search over cargo descriptions (Postgres
  `tsvector`), plus filters for consignee, shipper, HS-code prefix, U.S. port of
  unlading, foreign port of lading, and arrival date range.
- **Bill-of-lading detail** — voyage/manifest fields, shipper/consignee/notify
  parties, cargo descriptions, HTS tariff lines, containers.
- **Company directory & profiles** — raw manifest party names are normalized
  into canonical companies (suffix stripping, punctuation folding, trigram
  fuzzy indexes); profiles show monthly volume, top trading partners, top HS
  chapters, and recent shipments.
- **Analytics** — monthly volume and weight trends, port shares, commodity mix,
  top importers/suppliers, trailing-12-month growth.
- **Accounts** — email/password auth (scrypt + DB-backed sessions), saved
  searches, and a company watchlist.

## Data pipeline

The ingester (`src/lib/ams/ingest.ts`) consumes the **actual CBP AMS FOIA
vessel-manifest CSV layout** (`ams__header`, `ams__billgen`, `ams__shipper`,
`ams__consignee`, `ams__notifyparty`, `ams__cargodesc`, `ams__container`,
`ams__tariff`), keyed by the AMS `identifier` column. Re-ingesting the same
files is idempotent (existing identifiers are skipped) and company stats are
recomputed after each load.

For development, `npm run seed` writes a realistic 8,000-shipment sample
dataset **in that exact format** to `data/ams/`. When you subscribe to the real
CBP FOIA feed, drop its daily CSV extracts into a directory and run:

```bash
npm run ingest -- path/to/cbp-files
```

Nothing else changes.

## Production database

Without configuration the app uses a file-backed embedded Postgres (PGlite) in
`data/pglite/` — zero install, ideal for development. To use a real PostgreSQL
server, set:

```bash
DATABASE_URL=postgres://user:pass@host:5432/importlens
```

Schema bootstrap is automatic and idempotent (`src/db/ddl.ts`); the `pg_trgm`
extension is used for fuzzy company matching when available.

## Deploying to Railway

1. Create a Railway project from this GitHub repo (Railway auto-detects
   Next.js: build `npm run build`, start `npm start`).
2. Add a **PostgreSQL** service to the project.
3. On the app service, set the environment variable
   `DATABASE_URL` = `${{Postgres.DATABASE_URL}}` (the internal connection
   reference). Schema bootstrap happens automatically on first request.
4. Seed production data from your machine using the Postgres service's
   **public** connection URL (Connect tab):

   ```bash
   DATABASE_URL="postgresql://...proxy.rlwy.net.../railway?sslmode=require" npm run seed
   ```

   (`sslmode=require` in the URL — or `PGSSL=1` — enables TLS for the public
   proxy endpoint.)

> Without `DATABASE_URL` the app falls back to embedded PGlite on the
> container's ephemeral disk — it will work, but data resets on every deploy.

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` / `start` | Production build / serve |
| `npm run seed` | Generate sample AMS files (if absent), ingest, create demo user (`-- --force` regenerates) |
| `npm run ingest -- <dir>` | Ingest a directory of AMS FOIA CSV files |
