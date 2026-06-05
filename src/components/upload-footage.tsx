"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

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
  const [error, setError] = useState<string | null>(null);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setError(null);
    setStatus(`Preparing ${file.name}…`);
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

      setStatus(`Uploading ${file.name}…`);
      const put = await fetch(data.upload.url, {
        method: data.upload.method,
        headers: data.upload.headers,
        body: file,
      });
      if (!put.ok) throw new Error(`Upload failed (${put.status})`);

      setStatus(`Uploaded ${file.name}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setStatus(null);
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <input
        ref={inputRef}
        type="file"
        accept="video/*,audio/*"
        onChange={onPick}
        className="hidden"
      />
      <button
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        className="rounded-md bg-neutral-100 px-3 py-1.5 text-sm font-medium text-neutral-900 hover:bg-white disabled:opacity-60"
      >
        {busy ? "Uploading…" : "Upload footage"}
      </button>
      {status && <span className="text-xs text-neutral-400">{status}</span>}
      {error && <span className="text-xs text-red-400">{error}</span>}
    </div>
  );
}
