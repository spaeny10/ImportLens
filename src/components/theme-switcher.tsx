"use client";

import { useEffect, useRef, useState } from "react";
import { DEFAULT_THEME, THEME_COOKIE, THEMES } from "../lib/themes";

// Watches <html data-theme> so theme-aware client components (charts, map)
// re-render live when the user switches.
export function useTheme(): string {
  const [theme, setTheme] = useState(DEFAULT_THEME);
  useEffect(() => {
    const el = document.documentElement;
    setTheme(el.dataset.theme || DEFAULT_THEME);
    const obs = new MutationObserver(() =>
      setTheme(el.dataset.theme || DEFAULT_THEME)
    );
    obs.observe(el, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, []);
  return theme;
}

export function ThemeSwitcher() {
  const [open, setOpen] = useState(false);
  const [saveDefault, setSaveDefault] = useState(true);
  const current = useTheme();
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const apply = (id: string) => {
    document.documentElement.dataset.theme = id;
    // Persisted for a year when "save as default" is on; session-only otherwise.
    const persist = saveDefault ? `; max-age=${365 * 86400}` : "";
    document.cookie = `${THEME_COOKIE}=${id}; path=/; samesite=lax${persist}`;
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        title="Change theme"
        aria-label="Change theme"
        aria-expanded={open}
        className="flex items-center gap-1.5 rounded-md border border-slate-700 px-2.5 py-1.5 text-sm text-slate-300 hover:bg-slate-800"
      >
        <span
          className="inline-block h-3 w-3 rounded-full border border-slate-600"
          style={{ backgroundColor: THEMES.find((t) => t.id === current)?.swatch[2] }}
        />
        Theme
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-60 rounded-xl border border-slate-700 bg-slate-900 p-2 shadow-2xl">
          {THEMES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => apply(t.id)}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm ${
                current === t.id
                  ? "bg-slate-800 text-white"
                  : "text-slate-300 hover:bg-slate-800/60"
              }`}
            >
              <span className="flex overflow-hidden rounded border border-slate-600">
                {t.swatch.map((c) => (
                  <span key={c} className="h-4 w-3.5" style={{ backgroundColor: c }} />
                ))}
              </span>
              <span className="flex-1">{t.label}</span>
              {current === t.id && <span className="text-sky-400">✓</span>}
            </button>
          ))}
          <label className="mt-1 flex cursor-pointer items-center gap-2 border-t border-slate-800 px-3 pb-1 pt-3 text-xs text-slate-400">
            <input
              type="checkbox"
              checked={saveDefault}
              onChange={(e) => setSaveDefault(e.target.checked)}
              className="h-3.5 w-3.5 accent-sky-500"
            />
            Save as my default
          </label>
        </div>
      )}
    </div>
  );
}
