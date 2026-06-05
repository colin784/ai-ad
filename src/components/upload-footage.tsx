"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { SecondaryButton, palette } from "./panel-ui";

/**
 * Upload source footage for a project. Asks the server for a direct upload
 * target (Supabase signed URL in prod, a local PUT route in dev), then uploads
 * the file straight to storage so large files don't pass through the server.
 */
export function UploadFootage({ projectId }: { projectId: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setStatus(`Preparing ${file.name}`);
    try {
      const res = await fetch("/api/uploads", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          projectId,
          filename: file.name,
          contentType: file.type || "application/octet-stream",
          sizeBytes: file.size,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `Upload init failed (${res.status})`);

      setStatus(`Uploading ${file.name}`);
      const put = await fetch(data.upload.url, {
        method: data.upload.method,
        headers: data.upload.headers,
        body: file,
      });
      if (!put.ok) throw new Error(`Upload failed (${put.status})`);

      toast.success("Footage uploaded", { description: file.name });
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      toast.error("Couldn't upload footage", { description: message });
    } finally {
      setBusy(false);
      setStatus(null);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
      <input
        ref={inputRef}
        type="file"
        accept="video/*,audio/*"
        onChange={onPick}
        style={{ display: "none" }}
      />
      <SecondaryButton onClick={() => inputRef.current?.click()} disabled={busy}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          {busy && <Loader2 size={12} className="animate-spin" />}
          {busy ? "Uploading" : "Upload footage"}
        </span>
      </SecondaryButton>
      {status && (
        <span style={{ fontSize: 11, color: palette.tertiary }}>{status}</span>
      )}
    </div>
  );
}
