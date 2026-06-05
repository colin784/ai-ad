import Link from "next/link";
import { desc } from "drizzle-orm";
import { db } from "@/db";
import { creators, projects, sourceAssets } from "@/db/schema";
import { PIPELINE_STAGES, statusLabel } from "@/domain/jobState";
import {
  Card,
  EmptyState,
  PageHero,
  SectionLabel,
  Stat,
  StatusChip,
  palette,
  mono,
} from "@/components/panel-ui";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [creatorRows, projectRows, assetRows] = await Promise.all([
    db.select().from(creators),
    db.select().from(projects),
    db.select().from(sourceAssets).orderBy(desc(sourceAssets.createdAt)).limit(8),
  ]);

  const stats = [
    { label: "Creators", value: creatorRows.length, href: "/creators" },
    { label: "Projects", value: projectRows.length, href: "/projects" },
    { label: "Assets", value: assetRows.length, href: "/assets" },
  ];

  return (
    <div>
      <PageHero
        title="Dashboard"
        subtitle="Transcript-driven ad editor · Phase 1 foundation"
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 16,
          marginBottom: 24,
        }}
      >
        {stats.map((s) => (
          <Link key={s.label} href={s.href} style={{ textDecoration: "none" }}>
            <Card>
              <Stat label={s.label} value={s.value} />
            </Card>
          </Link>
        ))}
      </div>

      <Card style={{ marginBottom: 24 }}>
        <SectionLabel>Pipeline</SectionLabel>
        <div
          style={{
            marginTop: 12,
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: 8,
          }}
        >
          {PIPELINE_STAGES.map((stage, i) => (
            <div key={stage} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span
                style={{
                  background: "#0a0a0a",
                  border: `1px solid ${palette.subBorder}`,
                  color: palette.body,
                  padding: "4px 10px",
                  borderRadius: 4,
                  fontSize: 11,
                  fontWeight: 600,
                }}
              >
                {statusLabel(stage)}
              </span>
              {i < PIPELINE_STAGES.length - 1 && (
                <span style={{ color: palette.placeholder, fontFamily: mono }}>{"→"}</span>
              )}
            </div>
          ))}
        </div>
        <div style={{ marginTop: 14, fontSize: 12, color: palette.tertiary }}>
          Human approval is required before export — no fully-automatic publish.
        </div>
      </Card>

      <SectionLabel style={{ marginBottom: 10 }}>Recent assets</SectionLabel>
      {assetRows.length === 0 ? (
        <EmptyState>
          No assets yet. Run <code style={{ fontFamily: mono }}>npm run db:seed</code> to load
          sample data, then open a project.
        </EmptyState>
      ) : (
        <Card pad={0}>
          <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
            {assetRows.map((a, i) => (
              <li
                key={a.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "12px 20px",
                  borderTop: i === 0 ? "none" : `1px solid ${palette.divider}`,
                }}
              >
                <span style={{ fontSize: 13, color: palette.strongText }}>
                  {a.filename}
                </span>
                <StatusChip status={a.status} label={statusLabel(a.status)} />
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
