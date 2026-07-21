import { getDb } from "../src/db";
import { sql } from "drizzle-orm";

async function main() {
  const db = await getDb();
  const top = await db.execute(
    sql`SELECT name, shipments_as_consignee c, shipments_as_shipper s, total_weight_kg w FROM companies ORDER BY shipments_as_consignee DESC LIMIT 5`
  );
  console.log("top importers:", top.rows);
  const fts = await db.execute(
    sql`SELECT count(*)::int n FROM shipments WHERE to_tsvector('english', coalesce(description_summary,'')) @@ plainto_tsquery('english', 'solar panels')`
  );
  console.log("FTS 'solar panels':", fts.rows);
  const months = await db.execute(
    sql`SELECT to_char(arrival_date,'YYYY-MM') m, count(*)::int n FROM shipments GROUP BY 1 ORDER BY 1 DESC LIMIT 4`
  );
  console.log("recent months:", months.rows);
  const trgm = await db.execute(
    sql`SELECT name FROM companies WHERE name % 'pasific home goods' LIMIT 3`
  ).catch((e) => ({ rows: [`trgm error: ${e.message}`] }));
  console.log("trigram fuzzy 'pasific home goods':", trgm.rows);
  process.exit(0);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
