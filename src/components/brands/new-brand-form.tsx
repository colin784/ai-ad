"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Card, PrimaryButton, SectionLabel, inputStyle, palette } from "@/components/panel-ui";

export function NewBrandForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  async function create() {
    if (!text.trim()) {
      toast.error("Paste a brief or script first");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/brands", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: name.trim() || undefined, text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create template");
      toast.success("Brand template created", { description: data.name });
      setName("");
      setText("");
      router.refresh();
    } catch (err) {
      toast.error("Couldn't create template", {
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <SectionLabel>New template from brief</SectionLabel>
      <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Brand name (optional — parsed from the brief if blank)"
          style={inputStyle}
        />
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Paste the brand brief or script here — compliance rules, hook, selling points, promo code, QR/placement…"
          rows={8}
          style={{ ...inputStyle, resize: "vertical", lineHeight: 1.5, fontFamily: "inherit" }}
        />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 11, color: palette.tertiary }}>
            Claude parses it into a structured template (compliance, hook, placement, render style).
          </span>
          <PrimaryButton onClick={create} disabled={busy}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              {busy && <Loader2 size={12} className="animate-spin" />}
              {busy ? "Parsing" : "Create template"}
            </span>
          </PrimaryButton>
        </div>
      </div>
    </Card>
  );
}
