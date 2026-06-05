import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import {
  EdlSchema,
  ASPECT_RATIOS,
  SEGMENT_ROLES,
  type Edl,
  type TranscriptContent,
} from "@/domain/edl";
import { renderBriefForPrompt, type Brief } from "@/domain/brief";
import { checkEdlCompliance, complianceErrors } from "@/domain/compliance";
import { renderPlaybookForPrompt } from "@/domain/playbook";
import type { AnalyzeInput, LlmProvider } from "../types";

/**
 * Anthropic Claude LLM analysis (the AI step, scope §5.3).
 *
 * Uses the best available model (Claude Opus 4.8) with:
 *  - structured outputs (a hand-written JSON Schema via `output_format`) so the
 *    model's JSON is schema-constrained at generation time — no brittle "respond
 *    with JSON" prompting;
 *  - adaptive thinking, so the model reasons about hook selection / pacing;
 *  - prompt caching on the stable system prompt (the EDL contract), so repeated
 *    analyses across a project only pay for the volatile transcript;
 *  - a repair-retry that re-validates every returned variant against our real
 *    EdlSchema (segment overlap/ordering, etc.) before it reaches the renderer.
 *
 * The model only ever sees text + timestamps; application code maps the chosen
 * spans back to video. The model never touches pixels.
 *
 * Note: we hand-write the JSON Schema rather than use the SDK's
 * `betaZodOutputFormat` helper because that helper requires zod v4, while this
 * project (and our domain schemas) are on zod v3. Validation still flows through
 * our zod-v3 EdlSchema after parsing.
 */

const DEFAULT_MODEL = "claude-opus-4-8";
const STRUCTURED_OUTPUTS_BETA = "structured-outputs-2025-12-15";
const MAX_ATTEMPTS = 2;

// Shape we ask the model to emit. The real invariants (overlap, ordering) are
// enforced by EdlSchema after parsing; this just constrains the JSON shape.
const LlmResponseSchema = z.object({
  variants: z
    .array(
      z.object({
        variantId: z.string(),
        targetSeconds: z.number(),
        aspectRatios: z.array(z.enum(ASPECT_RATIOS)).min(1),
        hookText: z.string(),
        segments: z
          .array(
            z.object({
              sourceStart: z.number(),
              sourceEnd: z.number(),
              transcript: z.string(),
              role: z.enum(SEGMENT_ROLES).nullable(),
            }),
          )
          .min(1),
        captions: z.enum(["burn_in", "overlay", "none"]),
        cta: z.string().nullable(),
      }),
    )
    .min(1),
});

// JSON Schema handed to the API for structured outputs. Mirrors LlmResponseSchema.
// Structured outputs require `additionalProperties: false` and every property
// listed in `required`; numeric/length constraints aren't supported here (we
// enforce those in EdlSchema).
const OUTPUT_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    variants: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          variantId: { type: "string" },
          targetSeconds: { type: "number" },
          aspectRatios: {
            type: "array",
            items: { type: "string", enum: [...ASPECT_RATIOS] },
          },
          hookText: { type: "string" },
          segments: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                sourceStart: { type: "number" },
                sourceEnd: { type: "number" },
                transcript: { type: "string" },
                role: { type: ["string", "null"], enum: [...SEGMENT_ROLES, null] },
              },
              required: ["sourceStart", "sourceEnd", "transcript", "role"],
            },
          },
          captions: { type: "string", enum: ["burn_in", "overlay", "none"] },
          cta: { type: ["string", "null"] },
        },
        required: [
          "variantId",
          "targetSeconds",
          "aspectRatios",
          "hookText",
          "segments",
          "captions",
          "cta",
        ],
      },
    },
  },
  required: ["variants"],
} as const;

const SYSTEM_PROMPT = `You are an expert short-form ad editor working from a creator's transcript.

Your job: given a timestamped transcript and a creative brief, choose which spoken segments to keep and assemble them into short ad variants. You produce an Edit Decision List (EDL) that a renderer consumes — you never see or process video, only transcript text and timestamps.

Rules for every variant you produce:
- Open with a strong HOOK — a punchy, scroll-stopping line drawn from the transcript.
- Select segments whose timestamps come ONLY from the provided transcript. Never invent timestamps or text.
- Each segment's sourceEnd must be greater than its sourceStart.
- Segments must NOT overlap in source time. When ordered by sourceStart, each segment must start at or after the previous one ends.
- Keep the total kept duration at or under the brief's target length (a little under is fine).
- Put the strongest hook segment first; you may then reorder later segments for narrative flow, as long as they don't overlap.
- Tag EVERY segment with its "role" (segue_in, hook, product_intro, how_it_works, benefit, proof, objection_handling, cta, promo_code, segue_out, …). Follow the HOUSE STYLE beat order below.
- Set "cta" to a short call-to-action if the footage supports one, otherwise null.
- Produce the number of distinct variants the brief requests, each with a different hook/angle. Give each a short variantId like "hook-a", "hook-b".

COMPLIANCE — non-negotiable:
- Obey every rule in the brief's COMPLIANCE section exactly.
- NEVER use any FORBIDDEN TERM listed in the brief, in the hook, any segment, or the CTA.
- Cover the key selling points and include the required call to action (and promo code, if given).
- A variant that violates compliance will be rejected and you'll be asked to redo it — get it right the first time.

${renderPlaybookForPrompt()}`;

let cachedClient: Anthropic | null = null;
function client(): Anthropic {
  if (!cachedClient) {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error(
        "ANTHROPIC_API_KEY is not set. Add it to .env (and set LLM_PROVIDER=anthropic).",
      );
    }
    cachedClient = new Anthropic();
  }
  return cachedClient;
}

function renderTranscript(transcript: TranscriptContent): string {
  const segs = transcript.segments;
  if (segs && segs.length) {
    return segs
      .map(
        (s) =>
          `[${s.start.toFixed(2)}-${s.end.toFixed(2)}]${s.speaker ? ` (${s.speaker})` : ""} ${s.text}`,
      )
      .join("\n");
  }
  return transcript.words
    .map((w) => `[${w.start.toFixed(2)}-${w.end.toFixed(2)}] ${w.text}`)
    .join(" ");
}

function buildUserMessage(transcript: TranscriptContent, brief: Brief): string {
  return [
    `BRIEF:`,
    renderBriefForPrompt(brief),
    ``,
    `TRANSCRIPT (each line is [start-end] (speaker) text, seconds):`,
    renderTranscript(transcript),
  ].join("\n");
}

function extractJsonText(content: Anthropic.Beta.BetaContentBlock[]): string | null {
  const textBlock = content.find((b) => b.type === "text");
  return textBlock && textBlock.type === "text" ? textBlock.text : null;
}

/** Map a parsed LLM variant into our validated domain Edl (throws if invalid). */
function toEdl(v: z.infer<typeof LlmResponseSchema>["variants"][number]): Edl {
  return EdlSchema.parse({
    variantId: v.variantId,
    targetSeconds: v.targetSeconds,
    aspectRatios: v.aspectRatios,
    hookText: v.hookText,
    segments: v.segments.map((s) => ({
      sourceStart: s.sourceStart,
      sourceEnd: s.sourceEnd,
      transcript: s.transcript,
      role: s.role ?? undefined, // model returns null when unsure
    })),
    captions: v.captions,
    cta: v.cta ?? undefined,
  });
}

export const anthropicLlm: LlmProvider = {
  name: "anthropic",
  async analyze({ transcript, brief }: AnalyzeInput): Promise<Edl[]> {
    const messages: Anthropic.Beta.BetaMessageParam[] = [
      { role: "user", content: buildUserMessage(transcript, brief) },
    ];

    let lastError = "";
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      const message = await client().beta.messages.create({
        model: process.env.LLM_MODEL ?? DEFAULT_MODEL,
        max_tokens: 16000,
        betas: [STRUCTURED_OUTPUTS_BETA],
        thinking: { type: "adaptive" },
        system: [
          {
            type: "text",
            text: SYSTEM_PROMPT,
            cache_control: { type: "ephemeral" },
          },
        ],
        messages,
        output_format: { type: "json_schema", schema: OUTPUT_JSON_SCHEMA },
      });

      const jsonText = extractJsonText(message.content);
      if (jsonText) {
        const parsed = LlmResponseSchema.safeParse(JSON.parse(jsonText));
        if (parsed.success) {
          const edls: Edl[] = [];
          const errors: string[] = [];
          for (const v of parsed.data.variants) {
            let edl: Edl;
            try {
              edl = toEdl(v);
            } catch (err) {
              errors.push(
                `variant "${v.variantId}": ${err instanceof Error ? err.message : String(err)}`,
              );
              continue;
            }
            // Deterministic compliance gate — forbidden terms / over-length
            // block the variant regardless of what the model claims.
            const report = checkEdlCompliance(edl, brief);
            const hard = complianceErrors(report);
            if (hard.length > 0) {
              errors.push(
                `variant "${v.variantId}" compliance: ${hard.map((c) => c.detail ?? c.label).join("; ")}`,
              );
              continue;
            }
            edls.push(edl);
          }
          if (edls.length > 0) return edls;
          lastError = errors.join("; ") || "no valid variants produced";
        } else {
          lastError = `response did not match the expected shape: ${parsed.error.message}`;
        }
      } else {
        lastError =
          message.stop_reason === "refusal"
            ? "model refused the request"
            : "model did not return a JSON text block";
      }

      // Repair turn: echo the attempt back and report what failed.
      messages.push({ role: "assistant", content: message.content });
      messages.push({
        role: "user",
        content: `Those variants failed validation: ${lastError}. Fix them — ensure segments don't overlap, sourceEnd > sourceStart, timestamps come from the transcript, and total duration is within target. Return corrected variants.`,
      });
    }

    throw new Error(`Anthropic analysis failed to produce a valid EDL: ${lastError}`);
  },
};
