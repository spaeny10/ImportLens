"use client";

import { useOptimistic, useTransition } from "react";
import { toggleWatch } from "../app/(app)/actions";

export function WatchButton({ companyId, watched }: { companyId: number; watched: boolean }) {
  const [optimistic, setOptimistic] = useOptimistic(watched);
  const [, startTransition] = useTransition();

  return (
    <button
      type="button"
      onClick={() =>
        startTransition(async () => {
          setOptimistic(!optimistic);
          await toggleWatch(companyId);
        })
      }
      className={`rounded-md px-4 py-2 text-sm font-medium ${
        optimistic
          ? "border border-amber-500/50 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20"
          : "border border-slate-700 text-slate-300 hover:bg-slate-800"
      }`}
    >
      {optimistic ? "★ Watching" : "☆ Watch company"}
    </button>
  );
}
