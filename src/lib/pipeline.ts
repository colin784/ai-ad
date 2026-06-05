import { eq } from "drizzle-orm";
import { db } from "@/db";
import {
  sourceAssets,
  transcripts,
  editDecisionLists,
  renderJobs,
  outputVariants,
  type AssetStatus,
} from "@/db/schema";
import { assertTransition } from "@/domain/jobState";
import { parseTranscript, type Edl } from "@/domain/edl";
import { cuesFromEdl, RENDER_SPEC } from "@/domain/graphics";
import {
  getAsrProvider,
  getLlmProvider,
  getRenderProvider,
  getLipSyncProvider,
  type Brief,
  type RenderConfig,
  type RenderOverlays,
} from "@/lib/providers";
import { getStorageProvider } from "@/lib/storage";
import { newId } from "@/lib/id";

/** Output encoding config (§1, §5), from the brief with spec defaults. */
function renderConfigFromBrief(brief: Brief): RenderConfig {
  const r = brief.render;
  return {
    width: r?.width ?? RENDER_SPEC.outputWidth,
    height: r?.height ?? RENDER_SPEC.outputHeight,
    codec: r?.codec ?? RENDER_SPEC.codec,
    silencePaddingMs: r?.silencePaddingMs ?? RENDER_SPEC.silencePaddingMs,
  };
}

/** Derive the brand overlays the renderer must burn in, from the brief. */
function overlaysFromBrief(brief: Brief): RenderOverlays {
  const p = brief.placement;
  return {
    qr: p
      ? {
          minSeconds: p.qrMinSeconds,
          delaySeconds: p.qrDelaySeconds,
          appearAtPercent: p.qrAppearAtPercent,
          position: p.qrPosition,
        }
      : undefined,
    endCardRequired: p?.endCardRequired,
    promoCode: brief.description?.promoCode,
    disclaimers: brief.compliance?.requiredDisclaimers,
  };
}

/**
 * In-process orchestration of the Phase 1 MVP loop:
 *
 *   transcribe → analyze (EDL) → render → review
 *
 * This stands in for the durable queue + workers described in §6. The seams
 * (providers, state machine, EDL validation) are real; only the execution
 * substrate is simplified. Swapping this for a Temporal/Redis worker later
 * means calling these same provider methods from a job handler.
 */

async function setStatus(
  assetId: string,
  from: AssetStatus,
  to: AssetStatus,
  extra: Partial<{ failedStage: string | null; errorMessage: string | null }> = {},
) {
  assertTransition(from, to);
  await db
    .update(sourceAssets)
    .set({ status: to, updatedAt: Date.now(), ...extra })
    .where(eq(sourceAssets.id, assetId));
}

async function fail(assetId: string, stage: string, err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  await db
    .update(sourceAssets)
    .set({
      status: "failed",
      failedStage: stage,
      errorMessage: message,
      updatedAt: Date.now(),
    })
    .where(eq(sourceAssets.id, assetId));
  throw err;
}

/** Step 1: transcribe the source media and persist the transcript. */
export async function runTranscription(assetId: string) {
  const asset = await requireAsset(assetId);
  try {
    await setStatus(assetId, asset.status, "transcribing");
    const content = await getAsrProvider().transcribe({
      storageKey: asset.storageKey,
    });
    await db.insert(transcripts).values({
      id: newId("tr"),
      assetId,
      content: JSON.stringify(content),
      provider: getAsrProvider().name,
    });
    await db
      .update(sourceAssets)
      .set({ durationSeconds: content.durationSeconds })
      .where(eq(sourceAssets.id, assetId));
    await setStatus(assetId, "transcribing", "ready_for_analysis");
  } catch (err) {
    await fail(assetId, "transcribing", err);
  }
}

/** Step 2: run LLM analysis, validate EDLs, and persist them. */
export async function runAnalysis(assetId: string, brief: Brief) {
  const asset = await requireAsset(assetId);
  try {
    const [tr] = await db
      .select()
      .from(transcripts)
      .where(eq(transcripts.assetId, assetId))
      .limit(1);
    if (!tr) throw new Error("No transcript found for asset");

    await setStatus(assetId, asset.status, "analyzed");
    const transcript = parseTranscript(tr.content);
    const edls = await getLlmProvider().analyze({ transcript, brief });

    for (const edl of edls) {
      await db.insert(editDecisionLists).values({
        id: newId("edl"),
        assetId,
        variantId: edl.variantId,
        payload: JSON.stringify(edl),
        approved: false,
      });
    }
    return edls;
  } catch (err) {
    await fail(assetId, "ready_for_analysis", err);
  }
}

/**
 * Step 3: render an approved EDL into the requested aspect ratios. Creates a
 * render job per aspect ratio (with retry accounting) and an OutputVariant per
 * success. Moves the asset into `review` when done.
 */
export async function runRender(assetId: string, edlId: string, brief?: Brief) {
  const asset = await requireAsset(assetId);
  const overlays = brief ? overlaysFromBrief(brief) : undefined;
  const config = brief ? renderConfigFromBrief(brief) : undefined;
  try {
    const [edlRow] = await db
      .select()
      .from(editDecisionLists)
      .where(eq(editDecisionLists.id, edlId))
      .limit(1);
    if (!edlRow) throw new Error("EDL not found");
    const edl = JSON.parse(edlRow.payload) as Edl;

    // Keyword-triggered graphic overlays in output time (§2–§4).
    const cues = cuesFromEdl(edl, brief?.brand);

    await setStatus(assetId, asset.status, "rendering");
    const renderer = getRenderProvider();

    for (const aspectRatio of edl.aspectRatios) {
      const jobId = newId("job");
      await db.insert(renderJobs).values({
        id: jobId,
        edlId,
        aspectRatio,
        status: "running",
        attempts: 1,
      });
      try {
        const result = await renderer.render({
          edl,
          aspectRatio,
          sourceStorageKey: asset.storageKey,
          overlays,
          cues,
          config,
        });
        await db
          .update(renderJobs)
          .set({ status: "succeeded", updatedAt: Date.now() })
          .where(eq(renderJobs.id, jobId));
        await db.insert(outputVariants).values({
          id: newId("out"),
          renderJobId: jobId,
          storageKey: result.storageKey,
          aspectRatio,
          durationSeconds: result.durationSeconds,
        });
      } catch (renderErr) {
        const message =
          renderErr instanceof Error ? renderErr.message : String(renderErr);
        await db
          .update(renderJobs)
          .set({ status: "failed", errorMessage: message, updatedAt: Date.now() })
          .where(eq(renderJobs.id, jobId));
        throw renderErr;
      }
    }

    await setStatus(assetId, "rendering", "review");
  } catch (err) {
    await fail(assetId, "rendering", err);
  }
}

/**
 * Convenience: run the whole MVP loop end-to-end for one asset, rendering the
 * first proposed variant. This is what the demo "Run pipeline" button calls.
 */
export async function runFullPipeline(assetId: string, brief: Brief) {
  await runTranscription(assetId);
  const edls = await runAnalysis(assetId, brief);
  if (edls && edls.length > 0) {
    const [first] = await db
      .select()
      .from(editDecisionLists)
      .where(eq(editDecisionLists.assetId, assetId))
      .limit(1);
    if (first) {
      // Auto-approve the first variant for the demo render (a human does this
      // in the real review editor — export still requires approval).
      await db
        .update(editDecisionLists)
        .set({ approved: true })
        .where(eq(editDecisionLists.id, first.id));
      await runRender(assetId, first.id, brief);
    }
  }

  // Opt-in audio-replacement / lip-sync pipeline (spec §6 / Pair 4).
  if (brief.rewrite?.enabled) {
    await runRewriteLipSync(assetId, brief);
  }
}

/**
 * Spec §6 / Pair 4: rewrite the read into a tighter, safer core pitch, generate
 * a new voiceover, and lip-sync it onto the original footage. Experimental and
 * off by default (brief.rewrite.enabled). Returns the lip-synced output key.
 *
 * NOTE: a real implementation generates TTS audio from the rewritten script;
 * here the script text stands in for that audio asset before lip-sync.
 */
export async function runRewriteLipSync(
  assetId: string,
  brief: Brief,
): Promise<string> {
  const asset = await requireAsset(assetId);
  const llm = getLlmProvider();
  if (!llm.rewriteScript) {
    throw new Error(`LLM provider "${llm.name}" does not support rewriteScript`);
  }
  const [tr] = await db
    .select()
    .from(transcripts)
    .where(eq(transcripts.assetId, assetId))
    .limit(1);
  if (!tr) throw new Error("No transcript found for asset");

  const targetSeconds = brief.rewrite?.targetSeconds ?? 45;
  const { script } = await llm.rewriteScript({
    transcript: parseTranscript(tr.content),
    brief,
    targetSeconds,
  });

  // Stand-in for TTS: persist the new VO script, then lip-sync to it.
  const storage = getStorageProvider();
  const audioKey = `rewrites/${assetId}/vo.txt`;
  await storage.putBytes(audioKey, new TextEncoder().encode(script), "text/plain");

  const { storageKey } = await getLipSyncProvider().sync({
    sourceStorageKey: asset.storageKey,
    newAudioStorageKey: audioKey,
  });
  return storageKey;
}

async function requireAsset(assetId: string) {
  const [asset] = await db
    .select()
    .from(sourceAssets)
    .where(eq(sourceAssets.id, assetId))
    .limit(1);
  if (!asset) throw new Error(`Asset not found: ${assetId}`);
  return asset;
}
