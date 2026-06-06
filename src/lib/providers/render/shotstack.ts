import type { RenderInput, RenderProvider, RenderResult, RenderOverlays } from "../types";
import type { OverlayCue, OverlayPosition } from "@/domain/graphics";
import type { Edl } from "@/domain/edl";
import type { RenderConfig } from "../types";
import { getStorageProvider } from "@/lib/storage";

/**
 * Shotstack render provider — turns an EDL into a real edited MP4 via the
 * Shotstack Edit API (managed render farm; scales without us running ffmpeg).
 *
 * Pipeline: source video → signed read URL (Shotstack fetches it) → timeline of
 * one video clip per kept segment (trim/length/start) → QR image overlay per
 * the cue → encode to the configured size → poll until done → download and
 * store the result in our object storage.
 *
 * Env: SHOTSTACK_API_KEY (required), SHOTSTACK_ENV ("stage" sandbox [default] |
 * "v1" production). Requires STORAGE_PROVIDER=supabase so the source has a
 * fetchable URL.
 */

const POSITION_MAP: Record<OverlayPosition, string> = {
  "top-right": "topRight",
  "bottom-right": "bottomRight",
  "bottom-center": "bottom",
  left: "left",
  "center-left": "left",
  hidden: "topRight",
};

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Pure mapping: EDL (+ overlays/cues/config) → a Shotstack Edit API request
 * body. Extracted so the timeline logic is unit-testable without the API.
 */
export function buildShotstackEdit(
  edl: Edl,
  srcUrl: string,
  overlays: RenderOverlays | undefined,
  cues: OverlayCue[] | undefined,
  config: RenderConfig | undefined,
) {
  let pos = 0;
  const videoClips = edl.segments.map((s) => {
    const length = +(s.sourceEnd - s.sourceStart).toFixed(3);
    const clip = {
      asset: { type: "video", src: srcUrl, trim: +s.sourceStart.toFixed(3) },
      start: +pos.toFixed(3),
      length,
    };
    pos = +(pos + length).toFixed(3);
    return clip;
  });
  const total = pos;

  const tracks: unknown[] = [];
  const qrCue = cues?.find((c) => c.asset === "qr");
  if (qrCue) {
    const raw = overlays?.qr?.content;
    const qrData = raw && !raw.startsWith("[") ? raw : "https://pnnl.co";
    const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&qzone=2&data=${encodeURIComponent(qrData)}`;
    const start = Math.max(0, Math.min(qrCue.startSeconds, total));
    const length = Math.max(1, Math.min(qrCue.endSeconds, total) - start);
    tracks.push({
      clips: [
        {
          asset: { type: "image", src: qrSrc },
          start,
          length,
          position: POSITION_MAP[qrCue.position] ?? "topRight",
          offset: { x: -0.06, y: -0.06 },
          scale: 0.22,
        },
      ],
    });
  }
  tracks.push({ clips: videoClips });

  const width = config?.width ?? 1920;
  const height = config?.height ?? 1080;
  return {
    body: {
      timeline: { background: "#000000", tracks },
      output: { format: "mp4", size: { width, height } },
    },
    totalSeconds: total,
  };
}

export const shotstackRenderer: RenderProvider = {
  name: "shotstack",
  async render({ edl, sourceStorageKey, overlays, cues, config }: RenderInput): Promise<RenderResult> {
    const apiKey = process.env.SHOTSTACK_API_KEY;
    if (!apiKey) throw new Error("SHOTSTACK_API_KEY is not set");
    const env = process.env.SHOTSTACK_ENV ?? "stage";
    const base = `https://api.shotstack.io/${env}`;

    const storage = getStorageProvider();
    const srcUrl = await storage.getReadUrl(sourceStorageKey, 7200);
    if (!srcUrl) {
      throw new Error(
        "Shotstack needs a fetchable source URL — set STORAGE_PROVIDER=supabase.",
      );
    }

    const { body, totalSeconds: total } = buildShotstackEdit(edl, srcUrl, overlays, cues, config);

    // Submit.
    const submit = await fetch(`${base}/render`, {
      method: "POST",
      headers: { "x-api-key": apiKey, "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const submitJson = await submit.json();
    if (!submit.ok) {
      throw new Error(`Shotstack submit failed (${submit.status}): ${JSON.stringify(submitJson).slice(0, 400)}`);
    }
    const renderId: string = submitJson.response?.id;
    if (!renderId) throw new Error("Shotstack: no render id returned");

    // Poll until done.
    const deadline = Date.now() + 6 * 60 * 1000;
    let url: string | undefined;
    while (Date.now() < deadline) {
      await sleep(4000);
      const st = await fetch(`${base}/render/${renderId}`, { headers: { "x-api-key": apiKey } });
      const stj = await st.json();
      const status = stj.response?.status;
      if (status === "done") {
        url = stj.response.url;
        break;
      }
      if (status === "failed") {
        throw new Error(`Shotstack render failed: ${stj.response?.error ?? "unknown"}`);
      }
    }
    if (!url) throw new Error("Shotstack render timed out");

    // Download the result and store it in our object storage.
    const bytes = new Uint8Array(await (await fetch(url)).arrayBuffer());
    const width = config?.width ?? 1920;
    const height = config?.height ?? 1080;
    const outKey = `renders/${edl.variantId}_${width}x${height}.mp4`;
    await storage.putBytes(outKey, bytes, "video/mp4");

    return { storageKey: outKey, durationSeconds: total };
  },
};
