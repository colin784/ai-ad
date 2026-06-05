import Link from "next/link";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { projects, creators } from "@/db/schema";
import { Card, EmptyState, PageHero, palette, mono } from "@/components/panel-ui";

export const revalidate = 30;

export default async function ProjectsPage() {
  const rows = await db
    .select({
      id: projects.id,
      name: projects.name,
      brief: projects.brief,
      creatorName: creators.name,
    })
    .from(projects)
    .leftJoin(creators, eq(projects.creatorId, creators.id));

  return (
    <div>
      <PageHero title="Projects" subtitle="Ad campaigns by creator" />
      {rows.length === 0 ? (
        <EmptyState>
          No projects yet. Run <code style={{ fontFamily: mono }}>npm run db:seed</code> to
          load sample data.
        </EmptyState>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16 }}>
          {rows.map((p) => (
            <Link key={p.id} href={`/projects/${p.id}`} style={{ textDecoration: "none" }}>
              <Card style={{ height: "100%" }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: palette.titleText }}>
                  {p.name}
                </div>
                <div style={{ marginTop: 4, fontSize: 12, color: palette.secondary }}>
                  {p.creatorName}
                </div>
                {p.brief && (
                  <div
                    style={{
                      marginTop: 12,
                      fontSize: 13,
                      color: palette.body,
                      lineHeight: 1.6,
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {p.brief}
                  </div>
                )}
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
