// UI themes. Each theme re-maps the CSS color variables the whole app is
// built on (see globals.css); "navy" is the built-in default (no overrides).
export const THEME_COOKIE = "importapp_theme";
export const DEFAULT_THEME = "navy";

export interface ThemeDef {
  id: string;
  label: string;
  dark: boolean; // controls map tile set
  swatch: [string, string, string]; // page, card, accent — for the picker
}

export const THEMES: ThemeDef[] = [
  { id: "navy", label: "Deep Navy", dark: true, swatch: ["#020617", "#0f172a", "#38bdf8"] },
  { id: "light", label: "Daylight", dark: false, swatch: ["#eef2f6", "#ffffff", "#0284c7"] },
  { id: "terminal", label: "Terminal", dark: true, swatch: ["#050505", "#0a0f0a", "#22c55e"] },
  { id: "violet", label: "Midnight Violet", dark: true, swatch: ["#0b0716", "#150e26", "#a78bfa"] },
  { id: "harbor", label: "Harbor", dark: true, swatch: ["#04121f", "#0a1e30", "#fbbf24"] },
];

export function isValidTheme(id: string | undefined): id is string {
  return !!id && THEMES.some((t) => t.id === id);
}

export function themeIsDark(id: string | undefined): boolean {
  return THEMES.find((t) => t.id === id)?.dark ?? true;
}
