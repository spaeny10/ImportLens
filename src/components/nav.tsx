"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "../app/(auth)/actions";

const LINKS = [
  { href: "/", label: "Dashboard" },
  { href: "/search", label: "Shipments" },
  { href: "/companies", label: "Companies" },
  { href: "/analytics", label: "Analytics" },
  { href: "/saved", label: "Saved" },
];

export function Nav({ userName }: { userName: string }) {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-20 border-b border-slate-800 bg-slate-950/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-6 px-4 sm:px-6">
        <Link href="/" className="text-lg font-bold tracking-tight text-white">
          Import<span className="text-sky-400">Lens</span>
        </Link>
        <nav className="flex flex-1 items-center gap-1 overflow-x-auto">
          {LINKS.map((l) => {
            const active = l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`rounded-md px-3 py-1.5 text-sm font-medium whitespace-nowrap ${
                  active
                    ? "bg-slate-800 text-white"
                    : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-slate-400 sm:inline">{userName}</span>
          <form action={logout}>
            <button
              type="submit"
              className="rounded-md border border-slate-700 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-800"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
