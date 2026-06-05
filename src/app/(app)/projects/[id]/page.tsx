import { notFound } from "next/navigation";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  projects,
  creators,
  sourceAssets,
  editDecisionLists,
  renderJobs,
  outputVariants,
} from "@/db/schema";
import { Card, PageHeader, StatusBadge, EmptyState } from "@/components/ui";
import { RunPipelineButton } from "@/components/run-pipeline-button";
import { UploadFootage } from "@/components/upload-footage";
import { edlDuration, type Edl } from "@/domain/edl";

export const dynamic = "force-dynamic";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [project] = await db
    .select({
      id: projects.id,
      name: projects.name,
      brief: projects.brief,
      creatorName: creators.name,
    })
    .from(projects)
    .leftJoin(creators, eq(projects.creatorId, creators.id))
    .where(eq(projects.id, id))
    .limit(1);

  if (!project) notFound();

  const assets = await db
    .select()
    .from(sourceAssets)
    .where(eq(sourceAssets.projectId, id));

  const assetIds = assets.map((a) => a.id);
  const edls = assetIds.length
    ? await db
        .select()
        .from(editDecisionLists)
        .where(inArray(editDecisionLists.assetId, assetIds))
    : [];

  const edlIds = edls.map((e) => e.id);
  const jobs = edlIds.length
    ? await db.select().from(renderJobs).where(inArray(renderJobs.edlId, edlIds))
    : [];
  const jobIds = jobs.map((j) => j.id);
  const outputs = jobIds.length
    ? await db
        .select()
        .from(outputVariants)
        .where(inArray(outputVariants.renderJobId, jobIds))
    : [];

  return (
    <div>
      <PageHeader title={project.name} subtitle={project.creatorName ?? undefined}>
        <UploadFootage projectId={id} />
      </PageHeader>
      {project.brief && (
        <Card className="mb-6">
          <div className="text-xs uppercase tracking-wide text-neutral-500">Brief</div>
          <p className="mt-1 text-sm text-neutral-300">{project.brief}</p>
        </Card>
      )}

      <h2 className="mb-3 text-sm font-medium text-neutral-300">Source assets</h2>
      {assets.length === 0 ? (
        <EmptyState message="No assets in this project yet." />
      ) : (
        <div className="space-y-4">
          {assets.map((asset) => {
            const assetEdls = edls.filter((e) => e.assetId === asset.id);
            return (
              <Card key={asset.id}>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-medium">{asset.filename}</div>
                    <div className="mt-1 flex items-center gap-2 text-xs text-neutral-500">
                      <StatusBadge status={asset.status} />
                      {asset.durationSeconds != null && (
                        <span>{asset.durationSeconds.toFixed(1)}s source</span>
                      )}
                    </div>
                    {asset.status === "failed" && asset.errorMessage && (
                      <p className="mt-2 text-xs text-red-400">
                        Failed at {asset.failedStage}: {asset.errorMessage}
                      </p>
                    )}
                  </div>
                  <RunPipelineButton assetId={asset.id} />
                </div>

                {assetEdls.length > 0 && (
                  <div className="mt-4 space-y-3 border-t border-neutral-800 pt-4">
                    {assetEdls.map((edlRow) => {
                      const edl = JSON.parse(edlRow.payload) as Edl;
                      const edlJobs = jobs.filter((j) => j.edlId === edlRow.id);
                      const edlOutputs = outputs.filter((o) =>
                        edlJobs.some((j) => j.id === o.renderJobId),
                      );
                      return (
                        <div key={edlRow.id} className="rounded-md bg-neutral-950/50 p-3">
                          <div className="flex items-center justify-between">
                            <div className="text-sm font-medium">
                              {edl.variantId}
                              {edlRow.approved && (
                                <span className="ml-2 text-xs text-emerald-400">
                                  approved
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-neutral-500">
                              {edl.segments.length} segments ·{" "}
                              {edlDuration(edl).toFixed(1)}s
                            </div>
                          </div>
                          <p className="mt-1 text-sm text-neutral-300">
                            “{edl.hookText}”
                          </p>
                          {edlOutputs.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-2">
                              {edlOutputs.map((o) => (
                                <span
                                  key={o.id}
                                  className="rounded bg-neutral-800 px-2 py-0.5 text-xs text-neutral-300"
                                >
                                  {o.aspectRatio} · {o.storageKey.split("/").pop()}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
