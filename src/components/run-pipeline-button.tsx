"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { PrimaryButton } from "./panel-ui";

/**
 * Demo control: kicks the full Phase-1 loop for one asset via the API route.
 * In production this would enqueue a job rather than awaiting the work inline.
 */
export function RunPipelineButton({ assetId }: { assetId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    try {
      const res = await fetch(`/api/pipeline/${assetId}`, { method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Request failed (${res.status})`);
      }
      toast.success("Pipeline complete");
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      toast.error("Couldn't run pipeline", { description: message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <PrimaryButton onClick={run} disabled={busy}>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
        {busy && <Loader2 size={12} className="animate-spin" />}
        {busy ? "Running" : "Run pipeline"}
      </span>
    </PrimaryButton>
  );
}
