import path from "path";
import fs from "fs";
import { generateSampleData } from "../src/lib/sample/generate";
import { ingestDirectory } from "../src/lib/ams/ingest";
import { getDb, schema } from "../src/db";
import { hashPassword } from "../src/lib/password";
import { sql } from "drizzle-orm";

// Generates sample AMS FOIA files (if not already present), ingests them, and
// creates a demo login. Run with: npm run seed  (add -- --force to regenerate)
async function main() {
  const force = process.argv.includes("--force");
  const dataDir = path.join(process.cwd(), "data", "ams");

  if (force || !fs.existsSync(path.join(dataDir, "ams__header_sample.csv"))) {
    console.log("Generating sample AMS FOIA dataset...");
    const gen = generateSampleData({ outDir: dataDir });
    console.log(`  wrote ${gen.files.length} files, ${gen.shipments} shipments, ${gen.containers} containers`);
  } else {
    console.log("Sample AMS files already present, skipping generation.");
  }

  console.log("Ingesting AMS files into database...");
  const started = Date.now();
  const res = await ingestDirectory(dataDir);
  console.log(
    `  files=${res.files} inserted=${res.shipmentsInserted} skipped=${res.shipmentsSkipped} companies=${res.companies} (${((Date.now() - started) / 1000).toFixed(1)}s)`
  );

  const db = await getDb();
  await db
    .insert(schema.users)
    .values({
      email: "demo@importapp.dev",
      name: "Demo User",
      passwordHash: hashPassword("demo1234"),
    })
    .onConflictDoNothing();

  const [{ count: shipmentCount }] = (
    await db.execute(sql`SELECT count(*)::int AS count FROM shipments`)
  ).rows as { count: number }[];
  const [{ count: companyCount }] = (
    await db.execute(sql`SELECT count(*)::int AS count FROM companies`)
  ).rows as { count: number }[];
  console.log(`Database now holds ${shipmentCount} shipments and ${companyCount} companies.`);
  console.log("Demo login: demo@importapp.dev / demo1234");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
