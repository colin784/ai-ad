import Link from "next/link";
import { desc } from "drizzle-orm";
import { db } from "@/db";
import { brands } from "@/db/schema";
import { safe } from "@/lib/safe-query";
import { Card, Chip, EmptyState, PageHero, SectionLabel, palette } from "@/components/panel-ui";
import { NewBrandForm } from "@/components/brands/new-brand-form";

export const revalidate = 30;

export default async function BrandsPage() {
  const rows = await safe(
    db
      .select({ id: brands.id, name: brands.name, brief: brands.brief, isPreset: brands.isPreset })
      .from(brands)
      .orderBy(desc(brands.createdAt)),
    [],
  );

  return (
    <div>
      <PageHero title="Brands" subtitle="Templates that drive how each brand's ads are cut" />

      <div style={{ marginBottom: 24 }}>
        <NewBrandForm />
      </div>

      <SectionLabel style={{ marginBottom: 10 }}>Templates</SectionLabel>
      {rows.length === 0 ? (
        <EmptyState>No templates yet — create one above.</EmptyState>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 16 }}>
          {rows.map((b) => {
            let overview = "";
            try {
              overview = (JSON.parse(b.brief).overview as string) ?? "";
            } catch {}
            return (
              <Link key={b.id} href={`/brands/${b.id}`} style={{ textDecoration: "none" }}>
                <Card style={{ height: "100%" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 15, fontWeight: 700, color: palette.titleText }}>
                      {b.name}
                    </span>
                    {b.isPreset && <Chip color={palette.tagGray}>Preset</Chip>}
                  </div>
                  {overview && (
                    <div
                      style={{
                        marginTop: 8,
                        fontSize: 13,
                        color: palette.body,
                        lineHeight: 1.6,
                        display: "-webkit-box",
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }}
                    >
                      {overview}
                    </div>
                  )}
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
