"use client";

import { BarChart, Bar, Cell, PieChart, Pie, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";
import { fmtInt } from "../lib/format";
import { useVizTokens } from "./charts";

const OTHER_COLOR = "#64748b";

function tooltipStyle(t: ReturnType<typeof useVizTokens>) {
  return {
    backgroundColor: t.tooltipBg,
    border: `1px solid ${t.tooltipBorder}`,
    borderRadius: 8,
    fontSize: 12,
    color: t.tooltipText,
  };
}

// Donut with a side legend (visible labels are required relief for the
// light-mode palette) — categorical slots assigned in fixed order.
export function CarrierDonut({
  data,
  total,
}: {
  data: { name: string; value: number; isOther?: boolean }[];
  total: number;
}) {
  const t = useVizTokens();
  const color = (i: number, isOther?: boolean) => (isOther ? OTHER_COLOR : t.cat[i % t.cat.length]);
  return (
    <div className="flex items-center gap-4">
      <div className="relative h-48 w-48 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius={54}
              outerRadius={88}
              paddingAngle={2}
              stroke="none"
              isAnimationActive={false}
            >
              {data.map((d, i) => (
                <Cell key={d.name} fill={color(i, d.isOther)} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={tooltipStyle(t)}
              formatter={(value, name) => [fmtInt(Number(value)), String(name)]}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-xl font-bold text-white">{fmtInt(total)}</div>
          <div className="text-[10px] uppercase tracking-wide text-slate-500">shipments</div>
        </div>
      </div>
      <ul className="min-w-0 flex-1 space-y-1.5 text-sm">
        {data.map((d, i) => (
          <li key={d.name} className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-sm"
              style={{ backgroundColor: color(i, d.isOther) }}
            />
            <span className="truncate text-slate-300">{d.name}</span>
            <span className="ml-auto tabular-nums text-slate-400">{fmtInt(d.value)}</span>
            <span className="w-11 text-right tabular-nums text-xs text-slate-500">
              {total > 0 ? ((d.value / total) * 100).toFixed(1) : "0.0"}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Vertical histogram — one measure across categories, single hue.
export function ChapterBars({
  data,
}: {
  data: { chapter: string; label: string; shipments: number }[];
}) {
  const t = useVizTokens();
  return (
    <ResponsiveContainer width="100%" height={210}>
      <BarChart data={data} margin={{ top: 18, right: 4, bottom: 0, left: -18 }}>
        <CartesianGrid stroke={t.grid} vertical={false} />
        <XAxis
          dataKey="chapter"
          tick={{ fill: t.muted, fontSize: 11 }}
          axisLine={{ stroke: t.axis }}
          tickLine={false}
        />
        <YAxis tick={{ fill: t.muted, fontSize: 11 }} axisLine={false} tickLine={false} />
        <Tooltip
          cursor={{ fill: "rgba(148,163,184,0.08)" }}
          contentStyle={tooltipStyle(t)}
          labelFormatter={(c, payload) => payload?.[0]?.payload?.label ?? String(c)}
          formatter={(value) => [fmtInt(Number(value)), "Shipments"]}
        />
        <Bar
          dataKey="shipments"
          fill={t.series}
          radius={[4, 4, 0, 0]}
          maxBarSize={30}
          isAnimationActive={false}
          label={{
            position: "top",
            fill: t.muted,
            fontSize: 10,
            formatter: (v: unknown) => fmtInt(Number(v ?? 0)),
          }}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

// Small share donut with a centered count — one per port.
export function MiniDonut({ label, value, total }: { label: string; value: number; total: number }) {
  const t = useVizTokens();
  const data = [
    { name: label, value },
    { name: "Other ports", value: Math.max(0, total - value) },
  ];
  return (
    <div className="flex flex-col items-center">
      <div className="relative h-28 w-28">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              innerRadius={34}
              outerRadius={50}
              paddingAngle={2}
              stroke="none"
              isAnimationActive={false}
            >
              <Cell fill={t.series} />
              <Cell fill={t.grid} />
            </Pie>
            <Tooltip
              contentStyle={tooltipStyle(t)}
              formatter={(value, name) => [fmtInt(Number(value)), String(name)]}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-bold text-white">{fmtInt(value)}</span>
        </div>
      </div>
      <div className="mt-1 max-w-[120px] truncate text-center text-xs text-slate-400">{label}</div>
      <div className="text-center text-[11px] text-slate-500">
        {total > 0 ? ((value / total) * 100).toFixed(1) : "0.0"}% share
      </div>
    </div>
  );
}
