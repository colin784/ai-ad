import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { sourceAssets, projects } from "@/db/schema";
import { Card, PageHeader, StatusBadge, EmptyState } from "@/components/ui";

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
      <PageHeader title="Assets" subtitle="All source footage and its pipeline status" />
      {rows.length === 0 ? (
        <EmptyState message="No assets yet. Run `npm run db:seed` to load sample data." />
      ) : (
        <Card>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-neutral-500">
                <th className="pb-2 font-medium">File</th>
                <th className="pb-2 font-medium">Project</th>
                <th className="pb-2 font-medium">Duration</th>
                <th className="pb-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800">
              {rows.map((a) => (
                <tr key={a.id}>
                  <td className="py-2">{a.filename}</td>
                  <td className="py-2 text-neutral-400">
                    {a.projectId ? (
                      <Link href={`/projects/${a.projectId}`} className="hover:text-white">
                        {a.projectName}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="py-2 text-neutral-400">
                    {a.durationSeconds != null ? `${a.durationSeconds.toFixed(1)}s` : "—"}
                  </td>
                  <td className="py-2">
                    <StatusBadge status={a.status} />
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
