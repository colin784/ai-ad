import type { Edl } from "./edl";

/**
 * Graphic-asset inventory, spatial placement, and keyword→overlay triggering —
 * the programmatic rule set extracted from human "gold standard" edits
 * (AI Video Editor Specification §2, §3, §4).
 *
 * Cues are derived DETERMINISTICALLY from the chosen transcript spans (not by
 * the LLM): the model selects what is said; this maps what's said to which
 * graphic appears, where, and when — in OUTPUT time (the concatenated cut).
 */

export const GRAPHIC_ASSETS = [
  "qr",
  "cta_text",
  "paypal_receipt",
  "app_browse",
  "cashout_ui",
] as const;
export type GraphicAsset = (typeof GRAPHIC_ASSETS)[number];

export type OverlayPosition =
  | "top-right"
  | "bottom-right"
  | "bottom-center"
  | "left"
  | "center-left"
  | "hidden";

export interface GraphicSpec {
  id: GraphicAsset;
  label: string;
  /** Default anchor (§3). QR may move to bottom-right or hide on no negative space. */
  defaultPosition: OverlayPosition;
  /** Once triggered, stays until the end of the video (§4). */
  persistToEnd: boolean;
  styling: string;
}

export const GRAPHIC_SPECS: Record<GraphicAsset, GraphicSpec> = {
  qr: {
    id: "qr",
    label: "QR code",
    defaultPosition: "top-right",
    persistToEnd: true,
    styling:
      "Black-and-white QR, rounded corners, white border, drop shadow. ~25% of frame width. Top-right quadrant (x 70–90%, y 5–50%); drop to bottom-right or hide if it would overlap the creator.",
  },
  cta_text: {
    id: "cta_text",
    label: "LINK IN DESC",
    defaultPosition: "bottom-center",
    persistToEnd: true,
    styling:
      'Large bold sans-serif white text "LINK IN DESC" with a thick black stroke/outline. Anchored bottom-center (y 85–95%).',
  },
  paypal_receipt: {
    id: "paypal_receipt",
    label: "PayPal receipt",
    defaultPosition: "left",
    persistToEnd: false,
    styling:
      'White card, PayPal-blue header, "$XXX.XX USD from Freecash.com", transaction ID, blue downward-arrow. Anchored left / center-left to balance the QR.',
  },
  app_browse: {
    id: "app_browse",
    label: "App UI (browse)",
    defaultPosition: "center-left",
    persistToEnd: false,
    styling:
      "Vertical 9:16 screen recording of the Freecash app scrolling game offers. Anchored center-left.",
  },
  cashout_ui: {
    id: "cashout_ui",
    label: "Cashout UI",
    defaultPosition: "left",
    persistToEnd: false,
    styling:
      "Vertical 9:16 dark-themed screen recording of the cashout screen (PayPal/Amazon) showing a balance. Anchored left.",
  },
};

export interface OverlayCue {
  asset: GraphicAsset;
  /** Output-cut time, seconds. */
  startSeconds: number;
  endSeconds: number;
  position: OverlayPosition;
  persist: boolean;
  label: string;
}

// Keyword triggers (§4). Brand name is added dynamically from the brief.
const TRIGGERS = {
  qr: /\bscan( the)? (qr|code)\b|\bqr code\b|\blink in (the |my )?(desc|description)\b/i,
  paypal_receipt:
    /\$\s?\d|\b\d+\s*(dollars|bucks)\b|\b(getting|got|get) paid\b|\bmade (some )?money\b|\bpaid out\b|\bcashed out\b/i,
  app_browse:
    /\bplay(ing)? games\b|\bdownload(ing)?\b|\boffers?\b|\btry(ing)? (out )?(the )?apps?\b|\bgames? and apps?\b/i,
  cashout_ui:
    /\bwithdraw(ing)?\b|\bcash(ing)? ?out\b|\bgift ?cards?\b|\btransfer (funds|money|to)\b/i,
} as const;

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export interface CueSegmentInput {
  transcript: string;
  durationSeconds: number;
}

/**
 * Derive overlay cues from the ordered, concatenated segments of a cut.
 * QR + CTA fire on the first brand mention / scan command and persist to the
 * end; supporting graphics fire on their keyword and hold for that segment.
 */
export function deriveCues(
  segments: CueSegmentInput[],
  opts: { brandName?: string } = {},
): OverlayCue[] {
  const total = segments.reduce((s, seg) => s + seg.durationSeconds, 0);
  const brandRe = opts.brandName
    ? new RegExp(`\\b${escapeRegExp(opts.brandName)}\\b`, "i")
    : null;

  const cues: OverlayCue[] = [];
  let t = 0;
  let qrPlaced = false;

  const push = (asset: GraphicAsset, start: number, end: number) => {
    const spec = GRAPHIC_SPECS[asset];
    cues.push({
      asset,
      startSeconds: +start.toFixed(2),
      endSeconds: +end.toFixed(2),
      position: spec.defaultPosition,
      persist: spec.persistToEnd,
      label: spec.label,
    });
  };

  for (const seg of segments) {
    const start = t;
    const end = +(t + seg.durationSeconds).toFixed(2);
    t = end;
    const text = seg.transcript;

    if (!qrPlaced && ((brandRe && brandRe.test(text)) || TRIGGERS.qr.test(text))) {
      qrPlaced = true;
      push("qr", start, total);
      push("cta_text", start, total);
    }
    if (TRIGGERS.paypal_receipt.test(text)) push("paypal_receipt", start, end);
    if (TRIGGERS.app_browse.test(text)) push("app_browse", start, end);
    if (TRIGGERS.cashout_ui.test(text)) push("cashout_ui", start, end);
  }

  // Fallback: if nothing triggered the QR (no brand mention / scan command),
  // bring it in at the learned 50% mark and hold to the end (playbook default).
  if (!qrPlaced && total > 0) {
    push("qr", +(total * 0.5).toFixed(2), total);
    push("cta_text", +(total * 0.5).toFixed(2), total);
  }

  return cues;
}

/** Convenience: derive cues straight from an EDL + brief brand. */
export function cuesFromEdl(edl: Edl, brandName?: string): OverlayCue[] {
  return deriveCues(
    edl.segments.map((s) => ({
      transcript: s.transcript,
      durationSeconds: s.sourceEnd - s.sourceStart,
    })),
    { brandName },
  );
}

// ---- Resolution / upscale rules (§1) ----

export const RENDER_SPEC = {
  outputWidth: 1920,
  outputHeight: 1080,
  codec: "hevc" as "hevc" | "h264",
  /** Buffer left around speech when removing silence (§5) — avoids clipping syllables. */
  silencePaddingMs: 75,
} as const;

/** Upscale factor from source height: 540p → 2.0, 720p → 1.5, else 1.0 (§1). */
export function upscaleFactorFor(height: number): number {
  if (height <= 0) return 1;
  if (height <= 540) return 2.0;
  if (height <= 720) return 1.5;
  return 1.0;
}
