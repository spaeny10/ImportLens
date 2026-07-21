import Link from "next/link";
import { fmtInt } from "../lib/format";

export function Card({
  title,
  children,
  className = "",
}: {
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-xl border border-slate-800 bg-slate-900 ${className}`}>
      {title && (
        <h2 className="border-b border-slate-800 px-5 py-3 text-sm font-semibold text-slate-200">
          {title}
        </h2>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}

export function PageHeader({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-xl font-bold text-white">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-400">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

export function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
      <div className="text-sm text-slate-400">{label}</div>
      <div className="mt-1 text-2xl font-bold text-white">{value}</div>
      {hint && <div className="mt-1 text-xs text-slate-500">{hint}</div>}
    </div>
  );
}

// Ranked horizontal-bar list (pure HTML — single hue, recessive chrome).
export function RankedBars({
  items,
}: {
  items: { label: React.ReactNode; key: string; value: number; href?: string }[];
}) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <ol className="space-y-2.5">
      {items.map((i) => (
        <li key={i.key}>
          <div className="mb-0.5 flex items-baseline justify-between gap-3 text-sm">
            <span className="truncate text-slate-300">
              {i.href ? (
                <Link href={i.href} className="hover:text-sky-400 hover:underline">
                  {i.label}
                </Link>
              ) : (
                i.label
              )}
            </span>
            <span className="tabular-nums text-slate-400">{fmtInt(i.value)}</span>
          </div>
          <div className="h-1.5 rounded-full bg-slate-800">
            <div
              className="h-1.5 rounded-full bg-[#3987e5]"
              style={{ width: `${(i.value / max) * 100}%` }}
            />
          </div>
        </li>
      ))}
    </ol>
  );
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-800 bg-slate-900/50 p-10 text-center text-sm text-slate-400">
      {children}
    </div>
  );
}
