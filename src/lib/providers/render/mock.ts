import type { RenderInput, RenderProvider, RenderResult } from "../types";
import { edlDuration } from "@/domain/edl";

/**
 * Fake renderer. A real implementation cuts + concatenates the EDL segments
 * with ffmpeg, burns in captions, applies an intro/outro + music bed, overlays
 * the brand QR code (held per `overlays.qr`), appends the end card, and outputs
 * the requested aspect ratio (optionally via Remotion for animated captions).
 * The mock just computes the resulting duration and returns a deterministic
 * storage key — tagging the QR into the key so the overlay seam is observable.
 */
export const mockRenderer: RenderProvider = {
  name: "mock",
  async render({ edl, aspectRatio, overlays, cues, config }: RenderInput): Promise<RenderResult> {
    const ar = aspectRatio.replace(":", "x");
    const durationSeconds = edlDuration(edl);
    const res = config ? `_${config.width}x${config.height}_${config.codec}` : "";
    const qrTag = overlays?.qr ? "_qr" : "";
    const endTag = overlays?.endCardRequired ? "_endcard" : "";
    const cueTag = cues && cues.length ? `_${cues.length}cues` : "";
    // A real renderer (ffmpeg + Remotion) would: upscale per config.upscaleFactor,
    // cut + concatenate the EDL with a config.silencePaddingMs buffer, burn in
    // each cue's graphic at its position/time, and encode to config.codec.
    return {
      storageKey: `renders/${edl.variantId}_${ar}${res}${qrTag}${endTag}${cueTag}.mp4`,
      durationSeconds,
    };
  },
};
