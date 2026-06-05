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
import {
  Card,
  Chip,
  EmptyState,
  PageHero,
  SectionLabel,
  StatusChip,
  SubCard,
  palette,
  mono,
} from "@/components/panel-ui";
import { RunPipelineButton } from "@/components/run-pipeline-button";
import { UploadFootage } from "@/components/upload-footage";
import { statusLabel } from "@/domain/jobState";
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
      <PageHero
        title={project.name}
        subtitle={project.creatorName ?? undefined}
        right={<UploadFootage projectId={id} />}
      />

      {project.brief && (
        <Card style={{ marginBottom: 24 }}>
          <SectionLabel>Brief</SectionLabel>
          <p
            style={{
              marginTop: 8,
              marginBottom: 0,
              fontSize: 13,
              color: palette.body,
              lineHeight: 1.6,
            }}
          >
            {project.brief}
          </p>
        </Card>
      )}

      <SectionLabel style={{ marginBottom: 12 }}>Source assets</SectionLabel>
      {assets.length === 0 ? (
        <EmptyState>No assets in this project yet.</EmptyState>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {assets.map((asset) => {
            const assetEdls = edls.filter((e) => e.assetId === asset.id);
            return (
              <Card key={asset.id}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    gap: 16,
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: palette.titleText,
                      }}
                    >
                      {asset.filename}
                    </div>
                    <div
                      style={{
                        marginTop: 8,
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        fontSize: 12,
                        color: palette.tertiary,
                      }}
                    >
                      <StatusChip status={asset.status} label={statusLabel(asset.status)} />
                      {asset.durationSeconds != null && (
                        <span style={{ fontFamily: mono }}>
                          {asset.durationSeconds.toFixed(1)}s source
                        </span>
                      )}
                    </div>
                    {asset.status === "failed" && asset.errorMessage && (
                      <div
                        style={{
                          marginTop: 12,
                          padding: "10px 12px",
                          background: "#1a0d0d",
                          border: "1px solid #2a1a1a",
                          borderRadius: 4,
                          fontSize: 12,
                          color: palette.destructive,
                          lineHeight: 1.5,
                        }}
                      >
                        Failed at {asset.failedStage}: {asset.errorMessage}
                      </div>
                    )}
                  </div>
                  <RunPipelineButton assetId={asset.id} />
                </div>

                {assetEdls.length > 0 && (
                  <div
                    style={{
                      marginTop: 18,
                      paddingTop: 18,
                      borderTop: `1px solid ${palette.divider}`,
                      display: "flex",
                      flexDirection: "column",
                      gap: 10,
                    }}
                  >
                    {assetEdls.map((edlRow) => {
                      const edl = JSON.parse(edlRow.payload) as Edl;
                      const edlJobs = jobs.filter((j) => j.edlId === edlRow.id);
                      const edlOutputs = outputs.filter((o) =>
                        edlJobs.some((j) => j.id === o.renderJobId),
                      );
                      return (
                        <SubCard key={edlRow.id} pad={14}>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              gap: 12,
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 10,
                                fontSize: 13,
                                fontWeight: 600,
                                color: palette.strongText,
                              }}
                            >
                              <span style={{ fontFamily: mono }}>{edl.variantId}</span>
                              {edlRow.approved && (
                                <Chip color={palette.accent}>Approved</Chip>
                              )}
                            </div>
                            <div
                              style={{
                                fontSize: 11,
                                color: palette.tertiary,
                                fontFamily: mono,
                              }}
                            >
                              {edl.segments.length} segments · {edlDuration(edl).toFixed(1)}s
                            </div>
                          </div>
                          <div
                            style={{
                              marginTop: 8,
                              fontSize: 13,
                              color: palette.body,
                              lineHeight: 1.6,
                            }}
                          >
                            &ldquo;{edl.hookText}&rdquo;
                          </div>
                          {edlOutputs.length > 0 && (
                            <div
                              style={{
                                marginTop: 12,
                                display: "flex",
                                flexWrap: "wrap",
                                gap: 8,
                              }}
                            >
                              {edlOutputs.map((o) => (
                                <Chip key={o.id} color={palette.tagBlue}>
                                  <span style={{ fontFamily: mono }}>{o.aspectRatio}</span>
                                  <span
                                    style={{
                                      marginLeft: 6,
                                      color: palette.secondary,
                                    }}
                                  >
                                    {o.storageKey.split("/").pop()}
                                  </span>
                                </Chip>
                              ))}
                            </div>
                          )}
                        </SubCard>
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
