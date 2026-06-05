import Link from "next/link";
import { desc } from "drizzle-orm";
import { db } from "@/db";
import { creators, projects, sourceAssets } from "@/db/schema";
import { PIPELINE_STAGES, statusLabel } from "@/domain/jobState";
import { Card, PageHeader, StatusBadge, EmptyState } from "@/components/ui";

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
      <PageHeader
        title="Dashboard"
        subtitle="Transcript-driven ad editor · Phase 1 foundation"
      />

      <div className="mb-8 grid grid-cols-3 gap-4">
        {stats.map((s) => (
          <Link key={s.label} href={s.href}>
            <Card className="transition hover:border-neutral-700">
              <div className="text-3xl font-semibold">{s.value}</div>
              <div className="mt-1 text-sm text-neutral-400">{s.label}</div>
            </Card>
          </Link>
        ))}
      </div>

      <Card className="mb-8">
        <div className="mb-3 text-sm font-medium text-neutral-300">Pipeline</div>
        <div className="flex flex-wrap items-center gap-2">
          {PIPELINE_STAGES.map((stage, i) => (
            <div key={stage} className="flex items-center gap-2">
              <span className="rounded-md bg-neutral-800 px-2 py-1 text-xs text-neutral-300">
                {statusLabel(stage)}
              </span>
              {i < PIPELINE_STAGES.length - 1 && (
                <span className="text-neutral-600">→</span>
              )}
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-neutral-500">
          Human approval is required before export — no fully-automatic publish.
        </p>
      </Card>

      <h2 className="mb-3 text-sm font-medium text-neutral-300">Recent assets</h2>
      {assetRows.length === 0 ? (
        <EmptyState message="No assets yet. Run `npm run db:seed` to load sample data, then open a project." />
      ) : (
        <Card>
          <ul className="divide-y divide-neutral-800">
            {assetRows.map((a) => (
              <li key={a.id} className="flex items-center justify-between py-2">
                <span className="text-sm">{a.filename}</span>
                <StatusBadge status={a.status} />
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
