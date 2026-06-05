import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { sourceAssets, projects } from "@/db/schema";
import { statusLabel } from "@/domain/jobState";
import {
  Card,
  EmptyState,
  PageHero,
  SectionLabel,
  StatusChip,
  palette,
  mono,
} from "@/components/panel-ui";

export const dynamic = "force-dynamic";

export default async function AssetsPage() {
  const rows = await db
    .select({
      id: sourceAssets.id,
      filename: sourceAssets.filename,
      status: sourceAssets.status,
      durationSeconds: sourceAssets.durationSeconds,
      projectId: sourceAssets.projectId,
      projectName: projects.name,
    })
    .from(sourceAssets)
    .leftJoin(projects, eq(sourceAssets.projectId, projects.id))
    .orderBy(desc(sourceAssets.createdAt));

  return (
    <div>
      <PageHero title="Assets" subtitle="All source footage and its pipeline status" />
      {rows.length === 0 ? (
        <EmptyState>
          No assets yet. Run <code style={{ fontFamily: mono }}>npm run db:seed</code> to
          load sample data.
        </EmptyState>
      ) : (
        <Card pad={0}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr>
                {["File", "Project", "Duration", "Status"].map((h) => (
                  <th
                    key={h}
                    style={{
                      textAlign: "left",
                      padding: "14px 20px",
                      borderBottom: `1px solid ${palette.divider}`,
                    }}
                  >
                    <SectionLabel>{h}</SectionLabel>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((a, i) => (
                <tr
                  key={a.id}
                  style={{
                    borderTop: i === 0 ? "none" : `1px solid ${palette.divider}`,
                  }}
                >
                  <td style={{ padding: "12px 20px", color: palette.strongText }}>
                    {a.filename}
                  </td>
                  <td style={{ padding: "12px 20px", color: palette.secondary }}>
                    {a.projectId ? (
                      <Link
                        href={`/projects/${a.projectId}`}
                        style={{ color: palette.secondary, textDecoration: "none" }}
                      >
                        {a.projectName}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td
                    style={{
                      padding: "12px 20px",
                      color: palette.secondary,
                      fontFamily: mono,
                    }}
                  >
                    {a.durationSeconds != null ? `${a.durationSeconds.toFixed(1)}s` : "—"}
                  </td>
                  <td style={{ padding: "12px 20px" }}>
                    <StatusChip status={a.status} label={statusLabel(a.status)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
