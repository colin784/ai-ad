import { NextResponse } from "next/server";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  sourceAssets,
  brands,
  editDecisionLists,
  renderJobs,
  outputVariants,
} from "@/db/schema";
import { runFullPipeline } from "@/lib/pipeline";
import { BriefSchema, createBrief } from "@/domain/brief";
import { edlDuration, type Edl } from "@/domain/edl";

export const runtime = "nodejs";
export const maxDuration = 120;

/**
 * POST /api/produce — turn uploaded footage into finished cut(s) using the
 * asset's brand template. Body: { assetId }.
 *
 * NOTE: runs the pipeline inline for the demo (transcribe → analyze → render).
 * Production should enqueue a job and stream progress.
 */
export async function POST(req: Request) {
  const { assetId } = (await req.json().catch(() => ({}))) as { assetId?: string };
  if (!assetId) {
    return NextResponse.json({ error: "assetId is required" }, { status: 400 });
  }

  try {
    const [asset] = await db.select().from(sourceAssets).where(eq(sourceAssets.id, assetId)).limit(1);
    if (!asset) return NextResponse.json({ error: "asset not found" }, { status: 404 });

    let brief = createBrief({});
    if (asset.brandId) {
      const [brand] = await db.select().from(brands).where(eq(brands.id, asset.brandId)).limit(1);
      if (brand) brief = BriefSchema.parse(JSON.parse(brand.brief));
    }

    await runFullPipeline(assetId, brief);

    // Collect the produced variants + render outputs.
    const edls = await db
      .select()
      .from(editDecisionLists)
      .where(eq(editDecisionLists.assetId, assetId));
    const edlIds = edls.map((e) => e.id);
    const jobs = edlIds.length
      ? await db.select().from(renderJobs).where(inArray(renderJobs.edlId, edlIds))
      : [];
    const jobIds = jobs.map((j) => j.id);
    const outputs = jobIds.length
      ? await db.select().from(outputVariants).where(inArray(outputVariants.renderJobId, jobIds))
      : [];

    const variants = edls.map((row) => {
      const edl = JSON.parse(row.payload) as Edl;
      const edlJobs = jobs.filter((j) => j.edlId === row.id);
      const outs = outputs.filter((o) => edlJobs.some((j) => j.id === o.renderJobId));
      return {
        variantId: edl.variantId,
        hookText: edl.hookText,
        segments: edl.segments.length,
        durationSeconds: +edlDuration(edl).toFixed(1),
        outputs: outs.map((o) => ({ aspectRatio: o.aspectRatio, storageKey: o.storageKey })),
      };
    });

    return NextResponse.json({ ok: true, variants });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
