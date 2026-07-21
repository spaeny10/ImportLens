"use client";

import { useActionState } from "react";
import Link from "next/link";
import type { AuthState } from "../app/(auth)/actions";

interface Field {
  name: string;
  label: string;
  type: string;
  placeholder?: string;
  autoComplete?: string;
}

export function AuthForm({
  action,
  title,
  fields,
  submitLabel,
  footer,
}: {
  action: (prev: AuthState, formData: FormData) => Promise<AuthState>;
  title: string;
  fields: Field[];
  submitLabel: string;
  footer: { text: string; linkText: string; href: string };
}) {
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-8 shadow-xl">
      <h1 className="mb-6 text-lg font-semibold text-white">{title}</h1>
      <form action={formAction} className="space-y-4">
        {fields.map((f) => (
          <div key={f.name}>
            <label htmlFor={f.name} className="mb-1 block text-sm font-medium text-slate-300">
              {f.label}
            </label>
            <input
              id={f.name}
              name={f.name}
              type={f.type}
              placeholder={f.placeholder}
              autoComplete={f.autoComplete}
              required
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
          </div>
        ))}
        {state.error && (
          <p className="rounded-md border border-red-900 bg-red-950 px-3 py-2 text-sm text-red-300">
            {state.error}
          </p>
        )}
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-md bg-sky-500 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-400 disabled:opacity-50"
        >
          {pending ? "Please wait…" : submitLabel}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-400">
        {footer.text}{" "}
        <Link href={footer.href} className="font-medium text-sky-400 hover:text-sky-300">
          {footer.linkText}
        </Link>
      </p>
    </div>
  );
}
