"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Demo control: kicks the full Phase-1 loop for one asset via the API route.
 * In production this would enqueue a job rather than awaiting the work inline.
 */
export function RunPipelineButton({ assetId }: { assetId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/pipeline/${assetId}`, { method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Request failed (${res.status})`);
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={run}
        disabled={busy}
        className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
      >
        {busy ? "Running…" : "Run pipeline"}
      </button>
      {error && <span className="text-xs text-red-400">{error}</span>}
    </div>
  );
}
