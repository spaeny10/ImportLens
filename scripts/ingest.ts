import { ingestDirectory } from "../src/lib/ams/ingest";

// Ingest a directory of CBP AMS FOIA CSV files (real feed or sample).
// Usage: npm run ingest -- <directory>
async function main() {
  const dir = process.argv[2];
  if (!dir) {
    console.error("Usage: npm run ingest -- <directory-of-ams-csv-files>");
    process.exit(1);
  }
  const res = await ingestDirectory(dir);
  console.log(
    `files=${res.files} inserted=${res.shipmentsInserted} skipped=${res.shipmentsSkipped} companies=${res.companies}`
  );
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
