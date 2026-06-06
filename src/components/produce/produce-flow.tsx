"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Loader2, Upload, Check } from "lucide-react";
import { toast } from "sonner";
import {
  Card,
  Chip,
  SecondaryButton,
  SectionLabel,
  EmptyState,
  palette,
  mono,
} from "@/components/panel-ui";

type Brand = { id: string; name: string };
type Variant = {
  variantId: string;
  hookText: string;
  segments: number;
  durationSeconds: number;
  outputs: { aspectRatio: string; storageKey: string }[];
};
type Phase = "idle" | "uploading" | "producing" | "done";

export function ProduceFlow({ brands }: { brands: Brand[] }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [brandId, setBrandId] = useState<string | null>(brands[0]?.id ?? null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [statusText, setStatusText] = useState<string | null>(null);
  const [variants, setVariants] = useState<Variant[] | null>(null);

  const busy = phase === "uploading" || phase === "producing";

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !brandId) return;
    setVariants(null);
    setPhase("uploading");
    setStatusText(`Uploading ${file.name}…`);
    try {
      const initRes = await fetch("/api/uploads", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          brandId,
          filename: file.name,
          contentType: file.type || "application/octet-stream",
          sizeBytes: file.size,
        }),
      });
      const init = await initRes.json();
      if (!initRes.ok) throw new Error(init.error ?? "Upload init failed");

      const put = await fetch(init.upload.url, {
        method: init.upload.method,
        headers: init.upload.headers,
        body: file,
      });
      if (!put.ok) throw new Error(`Upload failed (${put.status})`);

      setPhase("producing");
      setStatusText("Transcribing → analyzing → rendering…");
      const prodRes = await fetch("/api/produce", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ assetId: init.assetId }),
      });
      const prod = await prodRes.json();
      if (!prodRes.ok) throw new Error(prod.error ?? "Produce failed");

      setVariants(prod.variants ?? []);
      setPhase("done");
      setStatusText(null);
      toast.success("Finished cut ready", {
        description: `${prod.variants?.length ?? 0} variant(s) produced`,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      toast.error("Couldn't produce", { description: message });
      setPhase("idle");
      setStatusText(null);
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  if (brands.length === 0) {
    return (
      <EmptyState>
        No brand templates yet. Create one on the{" "}
        <Link href="/brands" style={{ color: palette.accent }}>
          Brands
        </Link>{" "}
        tab, or run <code style={{ fontFamily: mono }}>npm run db:seed</code>.
      </EmptyState>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Step 1 — brand */}
      <div>
        <SectionLabel style={{ marginBottom: 10 }}>1 · Choose a brand template</SectionLabel>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12 }}>
          {brands.map((b) => {
            const active = b.id === brandId;
            return (
              <button
                key={b.id}
                onClick={() => setBrandId(b.id)}
                disabled={busy}
                style={{
                  textAlign: "left",
                  padding: "14px 16px",
                  borderRadius: 4,
                  background: active ? "rgba(74,222,128,0.08)" : palette.panelBg,
                  border: `1px solid ${active ? "rgba(74,222,128,0.35)" : palette.border}`,
                  color: palette.titleText,
                  cursor: busy ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 8,
                  transition: "background 120ms, border-color 120ms",
                }}
              >
                <span style={{ fontSize: 14, fontWeight: 600 }}>{b.name}</span>
                {active && <Check size={14} color={palette.accent} />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Step 2 — footage */}
      <div>
        <SectionLabel style={{ marginBottom: 10 }}>2 · Upload raw footage</SectionLabel>
        <input
          ref={inputRef}
          type="file"
          accept="video/*,audio/*"
          onChange={onPick}
          style={{ display: "none" }}
        />
        <button
          onClick={() => inputRef.current?.click()}
          disabled={busy || !brandId}
          style={{
            width: "100%",
            padding: "32px 20px",
            borderRadius: 4,
            border: `1px dashed ${palette.controlBorder}`,
            background: palette.subCardBg,
            color: palette.body,
            cursor: busy ? "not-allowed" : "pointer",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 8,
            transition: "border-color 120ms",
          }}
        >
          {busy ? (
            <Loader2 size={20} className="animate-spin" />
          ) : (
            <Upload size={20} color={palette.secondary} />
          )}
          <span style={{ fontSize: 13, fontWeight: 600, color: palette.strongText }}>
            {statusText ?? "Drop footage or click to upload"}
          </span>
          <span style={{ fontSize: 11, color: palette.tertiary }}>
            Transcribe → analyze → render, using the selected brand&rsquo;s style &amp; compliance
          </span>
        </button>
      </div>

      {/* Step 3 — result */}
      {variants && (
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 10,
            }}
          >
            <SectionLabel>3 · Finished cut</SectionLabel>
            <Link href="/review" style={{ textDecoration: "none" }}>
              <SecondaryButton>Refine in editor</SecondaryButton>
            </Link>
          </div>
          {variants.length === 0 ? (
            <EmptyState>No variants produced.</EmptyState>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {variants.map((v) => (
                <Card key={v.variantId}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 12,
                    }}
                  >
                    <span style={{ fontFamily: mono, fontSize: 13, fontWeight: 600, color: palette.strongText }}>
                      {v.variantId}
                    </span>
                    <span style={{ fontSize: 11, color: palette.tertiary, fontFamily: mono }}>
                      {v.segments} segments · {v.durationSeconds}s
                    </span>
                  </div>
                  <div style={{ marginTop: 8, fontSize: 13, color: palette.body, lineHeight: 1.6 }}>
                    &ldquo;{v.hookText}&rdquo;
                  </div>
                  {v.outputs.length > 0 && (
                    <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {v.outputs.map((o, i) => (
                        <Chip key={i} color={palette.tagBlue}>
                          <span style={{ fontFamily: mono }}>{o.aspectRatio}</span>
                          <span style={{ marginLeft: 6, color: palette.secondary }}>
                            {o.storageKey.split("/").pop()}
                          </span>
                        </Chip>
                      ))}
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
