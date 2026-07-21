"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { useEffect, useState } from "react";
import { fmtInt, fmtMonth, fmtWeight } from "../lib/format";
import { useTheme } from "./theme-switcher";

// Chart chrome follows the active theme via the --viz-* CSS variables.
// Recharts writes colors as SVG attributes (where var() doesn't resolve),
// so tokens are read from computed styles and re-read on theme change.
interface VizTokens {
  series: string;
  grid: string;
  axis: string;
  muted: string;
  tooltipBg: string;
  tooltipBorder: string;
  tooltipText: string;
}

const FALLBACK: VizTokens = {
  series: "#3987e5",
  grid: "#1e293b",
  axis: "#334155",
  muted: "#64748b",
  tooltipBg: "#0f172a",
  tooltipBorder: "#334155",
  tooltipText: "#e2e8f0",
};

function useVizTokens(): VizTokens {
  const theme = useTheme();
  const [tokens, setTokens] = useState(FALLBACK);
  useEffect(() => {
    const cs = getComputedStyle(document.documentElement);
    const read = (name: string, fallback: string) =>
      cs.getPropertyValue(name).trim() || fallback;
    setTokens({
      series: read("--viz-series", FALLBACK.series),
      grid: read("--viz-grid", FALLBACK.grid),
      axis: read("--viz-axis", FALLBACK.axis),
      muted: read("--viz-muted", FALLBACK.muted),
      tooltipBg: read("--viz-tooltip-bg", FALLBACK.tooltipBg),
      tooltipBorder: read("--viz-tooltip-border", FALLBACK.tooltipBorder),
      tooltipText: read("--viz-tooltip-text", FALLBACK.tooltipText),
    });
  }, [theme]);
  return tokens;
}

export interface MonthPoint {
  month: string;
  shipments: number;
  weight_kg: number;
}

export function MonthlyVolumeChart({
  data,
  height = 260,
}: {
  data: MonthPoint[];
  height?: number;
}) {
  const t = useVizTokens();
  const tooltipStyle = {
    backgroundColor: t.tooltipBg,
    border: `1px solid ${t.tooltipBorder}`,
    borderRadius: 8,
    fontSize: 12,
    color: t.tooltipText,
  };
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -12 }} barCategoryGap="25%">
        <CartesianGrid stroke={t.grid} strokeDasharray="0" vertical={false} />
        <XAxis
          dataKey="month"
          tickFormatter={fmtMonth}
          tick={{ fill: t.muted, fontSize: 11 }}
          axisLine={{ stroke: t.axis }}
          tickLine={false}
          interval="preserveStartEnd"
          minTickGap={24}
        />
        <YAxis
          tick={{ fill: t.muted, fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v: number) => fmtInt(v)}
        />
        <Tooltip
          cursor={{ fill: "rgba(148,163,184,0.08)" }}
          contentStyle={tooltipStyle}
          labelFormatter={(m) => fmtMonth(String(m))}
          formatter={(value) => [fmtInt(Number(value)), "Shipments"]}
        />
        {/* Animation depends on rAF, which throttled/background tabs never fire —
            bars would silently stay unrendered. Static render is instant anyway. */}
        <Bar dataKey="shipments" fill={t.series} radius={[4, 4, 0, 0]} maxBarSize={28} isAnimationActive={false} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function MonthlyWeightChart({
  data,
  height = 260,
}: {
  data: MonthPoint[];
  height?: number;
}) {
  const t = useVizTokens();
  const tooltipStyle = {
    backgroundColor: t.tooltipBg,
    border: `1px solid ${t.tooltipBorder}`,
    borderRadius: 8,
    fontSize: 12,
    color: t.tooltipText,
  };
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -4 }}>
        <CartesianGrid stroke={t.grid} vertical={false} />
        <XAxis
          dataKey="month"
          tickFormatter={fmtMonth}
          tick={{ fill: t.muted, fontSize: 11 }}
          axisLine={{ stroke: t.axis }}
          tickLine={false}
          interval="preserveStartEnd"
          minTickGap={24}
        />
        <YAxis
          tick={{ fill: t.muted, fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v: number) => fmtWeight(v)}
          width={70}
        />
        <Tooltip
          contentStyle={tooltipStyle}
          labelFormatter={(m) => fmtMonth(String(m))}
          formatter={(value) => [fmtWeight(Number(value)), "Gross weight"]}
        />
        <Line
          type="monotone"
          dataKey="weight_kg"
          stroke={t.series}
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, stroke: t.tooltipBg, strokeWidth: 2 }}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
