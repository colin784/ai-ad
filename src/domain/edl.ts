import { z } from "zod";

/**
 * The EDL (Edit Decision List) is the strict-JSON contract between the LLM
 * analysis step and the renderer (scope of work §5.3). The model only ever
 * emits text + timestamps; application code maps spans back to video. Every
 * EDL is validated against this schema *before* it reaches the renderer, so a
 * malformed model response fails loudly here instead of corrupting a render.
 */

export const ASPECT_RATIOS = ["9:16", "1:1", "16:9"] as const;
export const AspectRatioSchema = z.enum(ASPECT_RATIOS);
export type AspectRatio = z.infer<typeof AspectRatioSchema>;

// Beat roles observed across real long-form YouTube integrations (see
// src/domain/playbook.ts). Tagging each kept span with its role lets the
// renderer, compliance checks, and editor reason about structure.
export const SEGMENT_ROLES = [
  "segue_in",
  "hook",
  "problem",
  "product_intro",
  "how_it_works",
  "benefit",
  "proof",
  "social_proof",
  "objection_handling",
  "cta",
  "promo_code",
  "disclaimer",
  "segue_out",
  "other",
] as const;
export const SegmentRoleSchema = z.enum(SEGMENT_ROLES);
export type SegmentRole = z.infer<typeof SegmentRoleSchema>;

export const SegmentSchema = z
  .object({
    sourceStart: z.number().nonnegative(),
    sourceEnd: z.number().positive(),
    transcript: z.string(),
    role: SegmentRoleSchema.optional(),
  })
  .refine((s) => s.sourceEnd > s.sourceStart, {
    message: "sourceEnd must be greater than sourceStart",
    path: ["sourceEnd"],
  });
export type Segment = z.infer<typeof SegmentSchema>;

export const EdlSchema = z
  .object({
    variantId: z.string().min(1),
    targetSeconds: z.number().positive(),
    aspectRatios: z.array(AspectRatioSchema).min(1),
    hookText: z.string().min(1),
    segments: z.array(SegmentSchema).min(1),
    // Default "none": burned-in captions were absent in every analyzed
    // long-form YouTube integration (clean screen for QR + app graphics).
    captions: z.enum(["burn_in", "overlay", "none"]).default("none"),
    cta: z.string().optional(),
  })
  .superRefine((edl, ctx) => {
    // Segments should not overlap once ordered by start time — overlapping
    // spans would double-count footage in the concatenated cut.
    const ordered = [...edl.segments].sort((a, b) => a.sourceStart - b.sourceStart);
    for (let i = 1; i < ordered.length; i++) {
      if (ordered[i].sourceStart < ordered[i - 1].sourceEnd) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Segments overlap: [${ordered[i - 1].sourceStart}, ${ordered[i - 1].sourceEnd}] and [${ordered[i].sourceStart}, ${ordered[i].sourceEnd}]`,
          path: ["segments"],
        });
      }
    }
  });
export type Edl = z.infer<typeof EdlSchema>;

/**
 * Parse + validate raw model output into an Edl. Accepts an already-parsed
 * object or a JSON string. Throws a descriptive error the orchestrator can
 * surface to the UI / trigger a repair retry.
 */
export function parseEdl(input: unknown): Edl {
  const obj = typeof input === "string" ? JSON.parse(input) : input;
  return EdlSchema.parse(obj);
}

/** Non-throwing variant for call sites that want to branch on success. */
export function safeParseEdl(input: unknown) {
  try {
    const obj = typeof input === "string" ? JSON.parse(input) : input;
    return EdlSchema.safeParse(obj);
  } catch (err) {
    return {
      success: false as const,
      error: err instanceof Error ? err : new Error(String(err)),
    };
  }
}

/** Total kept duration across all segments (seconds). */
export function edlDuration(edl: Edl): number {
  return edl.segments.reduce((sum, s) => sum + (s.sourceEnd - s.sourceStart), 0);
}

// --- Transcript (output of the ASR step, input to the LLM) ---

export const WordSchema = z.object({
  text: z.string(),
  start: z.number().nonnegative(),
  end: z.number().nonnegative(),
  speaker: z.string().optional(),
  // Flags for later trimming suggestions (scope §5.2).
  isFiller: z.boolean().optional(),
});
export type Word = z.infer<typeof WordSchema>;

export const TranscriptSchema = z.object({
  language: z.string().default("en"),
  durationSeconds: z.number().nonnegative(),
  words: z.array(WordSchema),
  // Convenience: speaker-labelled, sentence-ish chunks for the review editor.
  segments: z
    .array(
      z.object({
        speaker: z.string().optional(),
        start: z.number().nonnegative(),
        end: z.number().nonnegative(),
        text: z.string(),
      }),
    )
    .optional(),
});
export type TranscriptContent = z.infer<typeof TranscriptSchema>;

export function parseTranscript(input: unknown): TranscriptContent {
  const obj = typeof input === "string" ? JSON.parse(input) : input;
  return TranscriptSchema.parse(obj);
}
