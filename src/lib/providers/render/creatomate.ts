import type {
  RenderInput,
  RenderProvider,
  RenderResult,
  RenderOverlays,
  RenderConfig,
} from "../types";
import type { OverlayCue, OverlayPosition } from "@/domain/graphics";
import type { Edl } from "@/domain/edl";
import { getStorageProvider } from "@/lib/storage";

/**
 * Creatomate render provider — turns an EDL into a real edited MP4 via the
 * Creatomate render API (managed, template/data-driven, scales to high volume).
 *
 * Pipeline: source video → signed read URL → one video element per kept segment
 * (trim_start / trim_duration, sequential time) → QR image overlay per the cue →
 * output to the configured size → poll until succeeded → download and store.
 *
 * Env: CREATOMATE_API_KEY (required). Requires STORAGE_PROVIDER=supabase.
 *
 * Note: field shapes follow Creatomate's "direct source" JSON; verify against
 * your account on first live render (the provider seam makes fixes a one-file
 * change).
 */

// QR anchor as frame-percentage (x,y of the element center).
const POSITION_MAP: Record<OverlayPosition, { x: string; y: string }> = {
  "top-right": { x: "85%", y: "13%" },
  "bottom-right": { x: "85%", y: "85%" },
  "bottom-center": { x: "50%", y: "88%" },
  left: { x: "13%", y: "50%" },
  "center-left": { x: "13%", y: "42%" },
  hidden: { x: "85%", y: "13%" },
};

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/** Pure mapping: EDL → Creatomate source JSON. Unit-testable without the API. */
export function buildCreatomateSource(
  edl: Edl,
  srcUrl: string,
  overlays: RenderOverlays | undefined,
  cues: OverlayCue[] | undefined,
  config: RenderConfig | undefined,
) {
  let pos = 0;
  const elements: Record<string, unknown>[] = [];
  for (const s of edl.segments) {
    const dur = +(s.sourceEnd - s.sourceStart).toFixed(3);
    elements.push({
      type: "video",
      track: 1,
      time: +pos.toFixed(3),
      duration: dur,
      source: srcUrl,
      trim_start: +s.sourceStart.toFixed(3),
      trim_duration: dur,
    });
    pos = +(pos + dur).toFixed(3);
  }
  const total = pos;

  const qrCue = cues?.find((c) => c.asset === "qr");
  if (qrCue) {
    const raw = overlays?.qr?.content;
    const qrData = raw && !raw.startsWith("[") ? raw : "https://pnnl.co";
    const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&qzone=2&data=${encodeURIComponent(qrData)}`;
    const start = Math.max(0, Math.min(qrCue.startSeconds, total));
    const length = Math.max(1, Math.min(qrCue.endSeconds, total) - start);
    const p = POSITION_MAP[qrCue.position] ?? POSITION_MAP["top-right"];
    elements.push({
      type: "image",
      track: 2,
      time: start,
      duration: length,
      source: qrSrc,
      x: p.x,
      y: p.y,
      width: "18%",
    });
  }

  return {
    source: {
      output_format: "mp4",
      width: config?.width ?? 1920,
      height: config?.height ?? 1080,
      elements,
    },
    totalSeconds: total,
  };
}

function qrUrlFor(overlays: RenderOverlays | undefined): string {
  const raw = overlays?.qr?.content;
  const data = raw && !raw.startsWith("[") ? raw : "https://pnnl.co";
  return `https://api.qrserver.com/v1/create-qr-code/?size=400x400&qzone=2&data=${encodeURIComponent(data)}`;
}

const CREATOMATE_BASE = "https://api.creatomate.com/v2";

/** Submit a render payload, poll until done, return the hosted output URL. */
async function submitAndPoll(
  apiKey: string,
  payload: Record<string, unknown>,
): Promise<string> {
  const submit = await fetch(`${CREATOMATE_BASE}/renders`, {
    method: "POST",
    headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  const submitJson = await submit.json();
  if (!submit.ok) {
    throw new Error(`Creatomate submit failed (${submit.status}): ${JSON.stringify(submitJson).slice(0, 400)}`);
  }
  const render = Array.isArray(submitJson) ? submitJson[0] : submitJson;
  const renderId: string = render?.id;
  if (!renderId) throw new Error("Creatomate: no render id returned");

  const deadline = Date.now() + 6 * 60 * 1000;
  while (Date.now() < deadline) {
    await sleep(4000);
    const st = await fetch(`${CREATOMATE_BASE}/renders/${renderId}`, {
      headers: { authorization: `Bearer ${apiKey}` },
    });
    const stj = await st.json();
    if (stj.status === "succeeded") return stj.url as string;
    if (stj.status === "failed") {
      throw new Error(`Creatomate render failed: ${stj.error_message ?? "unknown"}`);
    }
  }
  throw new Error("Creatomate render timed out");
}

export const creatomateRenderer: RenderProvider = {
  name: "creatomate",
  async render({ edl, sourceStorageKey, overlays, cues, config }: RenderInput): Promise<RenderResult> {
    const apiKey = process.env.CREATOMATE_API_KEY;
    if (!apiKey) throw new Error("CREATOMATE_API_KEY is not set");

    const storage = getStorageProvider();
    const srcUrl = await storage.getReadUrl(sourceStorageKey, 7200);
    if (!srcUrl) {
      throw new Error("Creatomate needs a fetchable source URL — set STORAGE_PROVIDER=supabase.");
    }

    const templateId = process.env.CREATOMATE_TEMPLATE_ID;
    let finalUrl: string;
    let total: number;

    if (templateId) {
      // Two-step: (1) render the script-aligned CUT (videos only, no overlays),
      // (2) wrap that cut in the designed brand template.
      const cut = buildCreatomateSource(edl, srcUrl, undefined, undefined, config);
      total = cut.totalSeconds;
      const cutUrl = await submitAndPoll(apiKey, { source: cut.source });

      const sourceKey = process.env.CREATOMATE_SOURCE_KEY ?? "Video.source";
      const modifications: Record<string, string> = { [sourceKey]: cutUrl };
      const hookKey = process.env.CREATOMATE_HOOK_KEY;
      if (hookKey) modifications[hookKey] = edl.hookText;
      const qrKey = process.env.CREATOMATE_QR_KEY;
      if (qrKey) modifications[qrKey] = qrUrlFor(overlays);

      finalUrl = await submitAndPoll(apiKey, { template_id: templateId, modifications });
    } else {
      // Single-step direct-source: cut + overlays in one render.
      const built = buildCreatomateSource(edl, srcUrl, overlays, cues, config);
      total = built.totalSeconds;
      finalUrl = await submitAndPoll(apiKey, { source: built.source });
    }

    const bytes = new Uint8Array(await (await fetch(finalUrl)).arrayBuffer());
    const width = config?.width ?? 1920;
    const height = config?.height ?? 1080;
    const outKey = `renders/${edl.variantId}_${width}x${height}.mp4`;
    await storage.putBytes(outKey, bytes, "video/mp4");

    return { storageKey: outKey, durationSeconds: total };
  },
};
