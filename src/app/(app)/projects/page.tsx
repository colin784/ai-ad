import Link from "next/link";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { projects, creators } from "@/db/schema";
import { Card, PageHeader, EmptyState } from "@/components/ui";

export const dynamic = "force-dynamic";

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
      <PageHeader title="Projects" subtitle="Ad campaigns by creator" />
      {rows.length === 0 ? (
        <EmptyState message="No projects yet. Run `npm run db:seed` to load sample data." />
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {rows.map((p) => (
            <Link key={p.id} href={`/projects/${p.id}`}>
              <Card className="h-full transition hover:border-neutral-700">
                <div className="font-medium">{p.name}</div>
                <div className="text-sm text-neutral-400">{p.creatorName}</div>
                {p.brief && (
                  <p className="mt-2 line-clamp-2 text-sm text-neutral-500">{p.brief}</p>
                )}
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
