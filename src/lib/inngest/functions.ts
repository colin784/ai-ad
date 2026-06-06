import { inngest } from "./client";
import {
  briefForAsset,
  runTranscription,
  runAnalysis,
  renderFirstVariant,
  runRewriteLipSync,
} from "@/lib/pipeline";

/**
 * The produce pipeline as a durable Inngest function. Each stage is a separate
 * step:
 *  - retried independently on failure (default backoff),
 *  - resumable (a crash re-runs only the unfinished step),
 *  - rate/concurrency-limited so thousands of uploads don't overwhelm the
 *    transcription API or render farm.
 *
 * `idempotency` keyed on the assetId means a duplicate produce event for the
 * same asset is a no-op — safe to retry from the client.
 */
export const produceAd = inngest.createFunction(
  {
    id: "produce-ad",
    retries: 3,
    // Cap how many full pipelines run at once across the whole system.
    concurrency: { limit: 25 },
    idempotency: "event.data.assetId",
  },
  { event: "asset/produce.requested" },
  async ({ event, step }) => {
    const { assetId } = event.data;

    const brief = await step.run("load-brief", () => briefForAsset(assetId));

    // Stage 1 — transcribe (ElevenLabs). Throttle to respect ASR rate limits.
    await step.run("transcribe", () => runTranscription(assetId));

    // Stage 2 — decide the cut (deterministic align, or LLM fallback).
    await step.run("analyze", () => runAnalysis(assetId, brief));

    // Stage 3 — render the approved variant.
    await step.run("render", () => renderFirstVariant(assetId, brief));

    if (brief.rewrite?.enabled) {
      await step.run("rewrite-lipsync", () => runRewriteLipSync(assetId, brief));
    }

    return { assetId, done: true };
  },
);

export const functions = [produceAd];
