// Company-name canonicalization. Raw AMS party names are free text typed by
// carriers — the same importer shows up as "ACME CORP", "ACME CORPORATION",
// "Acme Corp.", etc. We normalize aggressively to a matching key while keeping
// the first-seen raw name for display.

const LEGAL_SUFFIXES = new Set([
  "INC", "INCORPORATED", "LLC", "LLP", "LP", "LTD", "LIMITED", "CO", "COMPANY",
  "CORP", "CORPORATION", "PLC", "SA", "NV", "BV", "AG", "GMBH", "SRL", "SL",
  "SPA", "AB", "AS", "OY", "KK", "PTE", "PVT", "PTY", "SDN", "BHD", "USA",
]);

// Names that are not real companies — common in manifest data.
const PLACEHOLDER_PATTERNS = [
  /^TO (THE )?ORDER/i,
  /^ORDER OF/i,
  /NOT AVAILABLE/i,
  /^UNKNOWN/i,
  /^SAME AS/i,
  /^N\/?A$/i,
  /^CONFIDENTIAL/i,
];

export function isPlaceholderName(name: string | null | undefined): boolean {
  if (!name) return true;
  const t = name.trim();
  if (t.length < 2) return true;
  return PLACEHOLDER_PATTERNS.some((p) => p.test(t));
}

export function normalizeCompanyName(name: string): string {
  let s = name
    .toUpperCase()
    .replace(/&/g, " AND ")
    .replace(/[^A-Z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  // Strip trailing legal suffixes (possibly several: "ACME TRADING CO LTD").
  const words = s.split(" ");
  while (words.length > 1 && LEGAL_SUFFIXES.has(words[words.length - 1])) {
    words.pop();
  }
  s = words.join(" ");
  return s;
}
