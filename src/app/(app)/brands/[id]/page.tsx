import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { brands } from "@/db/schema";
import { BriefSchema } from "@/domain/brief";
import { Card, Chip, PageHero, SectionLabel, palette, mono } from "@/components/panel-ui";

export const dynamic = "force-dynamic";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <SectionLabel>{label}</SectionLabel>
      <div style={{ marginTop: 8, fontSize: 13, color: palette.body, lineHeight: 1.6 }}>
        {children}
      </div>
    </div>
  );
}

export default async function BrandDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [brand] = await db.select().from(brands).where(eq(brands.id, id)).limit(1);
  if (!brand) notFound();

  const brief = BriefSchema.parse(JSON.parse(brand.brief));
  const c = brief.compliance;
  const p = brief.placement;

  return (
    <div>
      <PageHero
        title={brand.name}
        subtitle={brief.platform ? `${brief.platform} · ${brief.targetSeconds}s · ${brief.aspectRatios.join(", ")}` : undefined}
        right={brand.isPreset ? <Chip color={palette.tagGray}>Preset</Chip> : undefined}
      />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <Card>
          {brief.overview && <Field label="Overview">{brief.overview}</Field>}
          {brief.primaryHook && <Field label="Primary hook">{brief.primaryHook}</Field>}
          {brief.sellingPoints.length > 0 && (
            <Field label="Selling points">
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {brief.sellingPoints.map((s, i) => (
                  <li key={i} style={{ marginBottom: 4 }}>{s}</li>
                ))}
              </ul>
            </Field>
          )}
          {brief.cta && <Field label="Call to action">{brief.cta}</Field>}
          {(brief.description?.promoCode || brief.description?.bonus) && (
            <Field label="Promo">
              {brief.description?.promoCode && (
                <span style={{ fontFamily: mono }}>{brief.description.promoCode}</span>
              )}
              {brief.description?.bonus ? ` · ${brief.description.bonus}` : ""}
            </Field>
          )}
        </Card>

        <Card>
          {c && (c.do.length > 0 || c.dont.length > 0 || c.forbiddenTerms.length > 0) && (
            <div style={{ marginBottom: 18 }}>
              <SectionLabel>Compliance</SectionLabel>
              {c.do.length > 0 && (
                <div style={{ marginTop: 8, fontSize: 13, color: palette.body }}>
                  <span style={{ color: palette.accent }}>Do:</span> {c.do.join(" · ")}
                </div>
              )}
              {c.dont.length > 0 && (
                <div style={{ marginTop: 6, fontSize: 13, color: palette.body }}>
                  <span style={{ color: palette.destructive }}>Don&rsquo;t:</span> {c.dont.join(" · ")}
                </div>
              )}
              {c.forbiddenTerms.length > 0 && (
                <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {c.forbiddenTerms.map((t, i) => (
                    <Chip key={i} color={palette.destructive}>{t}</Chip>
                  ))}
                </div>
              )}
            </div>
          )}
          {p && (
            <Field label="QR / placement">
              QR {p.qrPosition ?? "top-right"}
              {p.qrAppearAtPercent != null ? `, in at ${p.qrAppearAtPercent}%` : ""}
              {p.qrMinSeconds != null ? `, hold ≥${p.qrMinSeconds}s` : ""}
              {p.endCardRequired ? " · end card required" : ""}
            </Field>
          )}
          <Field label="Render">
            <span style={{ fontFamily: mono }}>
              {brief.render?.width ?? 1920}×{brief.render?.height ?? 1080} {(brief.render?.codec ?? "hevc").toUpperCase()} · {brief.render?.silencePaddingMs ?? 75}ms silence pad
            </span>
          </Field>
          {brief.script && (
            <Field label="Script">{brief.script.mode === "verbatim" ? "Read verbatim" : "Adapt to creator's tone"}</Field>
          )}
        </Card>
      </div>
    </div>
  );
}
