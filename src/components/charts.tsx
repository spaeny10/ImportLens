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
import { fmtInt, fmtMonth, fmtWeight } from "../lib/format";

// Chart chrome (dark surface): series blue #3987e5, recessive grid/axis ink,
// text in ink tokens — never the series color.
const SERIES = "#3987e5";
const GRID = "#1e293b";
const MUTED = "#64748b";

const tooltipStyle = {
  backgroundColor: "#0f172a",
  border: "1px solid #334155",
  borderRadius: 8,
  fontSize: 12,
  color: "#e2e8f0",
} as const;

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
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -12 }} barCategoryGap="25%">
        <CartesianGrid stroke={GRID} strokeDasharray="0" vertical={false} />
        <XAxis
          dataKey="month"
          tickFormatter={fmtMonth}
          tick={{ fill: MUTED, fontSize: 11 }}
          axisLine={{ stroke: "#334155" }}
          tickLine={false}
          interval="preserveStartEnd"
          minTickGap={24}
        />
        <YAxis
          tick={{ fill: MUTED, fontSize: 11 }}
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
        <Bar dataKey="shipments" fill={SERIES} radius={[4, 4, 0, 0]} maxBarSize={28} />
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
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -4 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis
          dataKey="month"
          tickFormatter={fmtMonth}
          tick={{ fill: MUTED, fontSize: 11 }}
          axisLine={{ stroke: "#334155" }}
          tickLine={false}
          interval="preserveStartEnd"
          minTickGap={24}
        />
        <YAxis
          tick={{ fill: MUTED, fontSize: 11 }}
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
          stroke={SERIES}
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, stroke: "#0f172a", strokeWidth: 2 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
