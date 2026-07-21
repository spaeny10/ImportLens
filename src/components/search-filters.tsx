"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { saveSearch } from "../app/(app)/actions";

const input =
  "w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500";
const label = "mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400";

export function SearchFilters({
  defaults,
  usPorts,
  foreignPorts,
}: {
  defaults: Record<string, string | undefined>;
  usPorts: string[];
  foreignPorts: string[];
}) {
  const router = useRouter();
  const [saving, startSave] = useTransition();
  const [savedFlash, setSavedFlash] = useState(false);
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState("");

  const hasFilters = Object.entries(defaults).some(([k, v]) => k !== "page" && v);

  const onSave = () => {
    startSave(async () => {
      await saveSearch(name || suggestName(defaults), Object.fromEntries(
        Object.entries(defaults).filter(([, v]) => v != null) as [string, string][]
      ));
      setNaming(false);
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 2000);
    });
  };

  return (
    <form method="GET" action="/search" className="rounded-xl border border-slate-800 bg-slate-900 p-5">
      {defaults.vessel && (
        <p className="mb-3 text-sm text-slate-400">
          Filtered to vessel <span className="font-semibold text-slate-200">{defaults.vessel}</span>
          <input type="hidden" name="vessel" value={defaults.vessel} />
        </p>
      )}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="sm:col-span-2">
          <label htmlFor="q" className={label}>Product / cargo description</label>
          <input id="q" name="q" defaultValue={defaults.q} placeholder="e.g. solar panels, furniture, lithium battery" className={input} />
        </div>
        <div>
          <label htmlFor="consignee" className={label}>Consignee (importer)</label>
          <input id="consignee" name="consignee" defaultValue={defaults.consignee} placeholder="Company name" className={input} />
        </div>
        <div>
          <label htmlFor="shipper" className={label}>Shipper (supplier)</label>
          <input id="shipper" name="shipper" defaultValue={defaults.shipper} placeholder="Company name" className={input} />
        </div>
        <div>
          <label htmlFor="hs" className={label}>HS code prefix</label>
          <input id="hs" name="hs" defaultValue={defaults.hs} placeholder="e.g. 8541" className={input} />
        </div>
        <div>
          <label htmlFor="port" className={label}>U.S. port of unlading</label>
          <select id="port" name="port" defaultValue={defaults.port ?? ""} className={input}>
            <option value="">Any port</option>
            {usPorts.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="origin" className={label}>Foreign port of lading</label>
          <select id="origin" name="origin" defaultValue={defaults.origin ?? ""} className={input}>
            <option value="">Any origin</option>
            {foreignPorts.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="from" className={label}>From</label>
            <input id="from" name="from" type="date" defaultValue={defaults.from} className={input} />
          </div>
          <div>
            <label htmlFor="to" className={label}>To</label>
            <input id="to" name="to" type="date" defaultValue={defaults.to} className={input} />
          </div>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button type="submit" className="rounded-md bg-sky-500 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-400">
          Search shipments
        </button>
        <button
          type="button"
          onClick={() => router.push("/search")}
          className="rounded-md border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800"
        >
          Reset
        </button>
        {hasFilters && !naming && (
          <button
            type="button"
            onClick={() => {
              setName(suggestName(defaults));
              setNaming(true);
            }}
            className="ml-auto rounded-md border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800"
          >
            {savedFlash ? "✓ Saved" : "☆ Save this search"}
          </button>
        )}
        {hasFilters && naming && (
          <div className="ml-auto flex items-center gap-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Search name"
              aria-label="Search name"
              className="w-56 rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-sky-500 focus:outline-none"
            />
            <button
              type="button"
              onClick={onSave}
              disabled={saving}
              className="rounded-md bg-sky-500 px-3 py-2 text-sm font-semibold text-white hover:bg-sky-400 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              onClick={() => setNaming(false)}
              className="rounded-md border border-slate-700 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </form>
  );
}

function suggestName(d: Record<string, string | undefined>): string {
  const parts: string[] = [];
  if (d.q) parts.push(d.q);
  if (d.consignee) parts.push(`to ${d.consignee}`);
  if (d.shipper) parts.push(`from ${d.shipper}`);
  if (d.hs) parts.push(`HS ${d.hs}`);
  if (d.origin) parts.push(`ex ${d.origin.split(",")[0]}`);
  if (d.port) parts.push(`via ${d.port.split(",")[0]}`);
  if (d.vessel) parts.push(`on ${d.vessel}`);
  return parts.join(" ") || "All shipments";
}
