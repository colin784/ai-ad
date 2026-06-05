import { z } from "zod";
import { AspectRatioSchema } from "./edl";
import { DEFAULT_INTEGRATION_SECONDS, QR_RULES } from "./playbook";

/**
 * Structured creative brief — modeled on real sponsor briefs (Panel/creator
 * ad integrations). The thin original Brief (just target length + tone) can't
 * represent what actually governs these ads: selling points, the required
 * hook, placement/QR rules, exact description copy, promo codes, the provided
 * script, and — most importantly — hard compliance rules (forbidden terms and
 * verbatim disclaimers a brand's legal team requires).
 *
 * This object is fed to the LLM as hard constraints, and compliance is then
 * deterministically re-checked against the generated copy (see compliance.ts).
 */

export const PlacementSchema = z.object({
  /** Ad must appear within the first N% of the host video (e.g. 10, 30). */
  appearWithinPercent: z.number().optional(),
  /** QR code must stay on screen at least N seconds. */
  qrMinSeconds: z.number().optional(),
  /** Bring the QR in N seconds into the ad (absolute). */
  qrDelaySeconds: z.number().optional(),
  /** Bring the QR in at this % of the integration length (relative). */
  qrAppearAtPercent: z.number().optional(),
  qrPosition: z.string().optional(), // e.g. "top-right"
  endCardRequired: z.boolean().optional(),
});
export type Placement = z.infer<typeof PlacementSchema>;

export const DescriptionSchema = z.object({
  /** Verbatim text for the top of the video description. */
  text: z.string().optional(),
  trackingLinkPlaceholder: z.string().optional(), // "[panel link]"
  promoCode: z.string().optional(), // "WELCOME5"
  bonus: z.string().optional(), // "$5 bonus"
  pinnedComment: z.boolean().optional(),
});
export type DescriptionReqs = z.infer<typeof DescriptionSchema>;

export const ComplianceSchema = z.object({
  /** Human-readable do/don't guidance (also surfaced to the model). */
  do: z.array(z.string()).default([]),
  dont: z.array(z.string()).default([]),
  /**
   * Words/phrases that must NOT appear in the spoken copy. Checked
   * deterministically with word-ish boundaries (so "bank" won't match
   * "banking"). This is the legal guardrail.
   */
  forbiddenTerms: z.array(z.string()).default([]),
  /** Verbatim disclaimers that must appear (typically in the description). */
  requiredDisclaimers: z.array(z.string()).default([]),
});
export type Compliance = z.infer<typeof ComplianceSchema>;

export const BriefScriptSchema = z.object({
  // "verbatim" → read as written; "adapt" → creator can use their own tone.
  mode: z.enum(["verbatim", "adapt"]).default("adapt"),
  variants: z.array(z.string()).default([]),
});
export type BriefScript = z.infer<typeof BriefScriptSchema>;

export const BriefSchema = z.object({
  brand: z.string(),
  overview: z.string().optional(),
  sellingPoints: z.array(z.string()).default([]),
  primaryHook: z.string().optional(),
  cta: z.string().optional(),
  // Default QR placement reflects the learned norm: bring the QR in around
  // the 50% mark, hold ≥20s, top-right.
  placement: PlacementSchema.default({
    qrMinSeconds: QR_RULES.minHoldSeconds,
    qrAppearAtPercent: QR_RULES.appearAtPercent,
    qrPosition: QR_RULES.defaultPosition,
  }),
  description: DescriptionSchema.optional(),
  compliance: ComplianceSchema.optional(),
  script: BriefScriptSchema.optional(),
  referenceExamples: z.array(z.string()).default([]),
  platform: z.string().optional(), // "youtube", "tiktok", "reels"
  tone: z.string().optional(),
  // Rendering / EDL parameters. Defaults target the primary format: long-form
  // YouTube brand integrations — 16:9, ~60s, dropped into a host video.
  targetSeconds: z.number().positive().default(DEFAULT_INTEGRATION_SECONDS),
  aspectRatios: z.array(AspectRatioSchema).min(1).default(["16:9"]),
  variantCount: z.number().int().positive().default(3),
});
export type Brief = z.infer<typeof BriefSchema>;

/** Build a Brief from a partial, filling defaults. Brand defaults if omitted. */
export function createBrief(input: Partial<z.input<typeof BriefSchema>> = {}): Brief {
  return BriefSchema.parse({ brand: input.brand ?? "Brand", ...input });
}

/** Render the brief as a constraint block for the LLM prompt. */
export function renderBriefForPrompt(brief: Brief): string {
  const lines: string[] = [];
  lines.push(`BRAND: ${brief.brand}`);
  if (brief.overview) lines.push(`OVERVIEW: ${brief.overview}`);
  if (brief.primaryHook) lines.push(`PRIMARY HOOK: ${brief.primaryHook}`);
  if (brief.sellingPoints.length) {
    lines.push(`KEY SELLING POINTS (cover the most important ones):`);
    brief.sellingPoints.forEach((p) => lines.push(`  - ${p}`));
  }
  if (brief.cta) lines.push(`REQUIRED CALL TO ACTION: ${brief.cta}`);
  if (brief.description?.promoCode) {
    lines.push(
      `PROMO CODE (must be spoken): ${brief.description.promoCode}${brief.description.bonus ? ` (${brief.description.bonus})` : ""}`,
    );
  }
  const c = brief.compliance;
  if (c) {
    if (c.do.length) {
      lines.push(`COMPLIANCE — DO:`);
      c.do.forEach((d) => lines.push(`  - ${d}`));
    }
    if (c.dont.length) {
      lines.push(`COMPLIANCE — DON'T:`);
      c.dont.forEach((d) => lines.push(`  - ${d}`));
    }
    if (c.forbiddenTerms.length) {
      lines.push(
        `FORBIDDEN TERMS — these words/phrases must NEVER appear in the copy: ${c.forbiddenTerms.map((t) => `"${t}"`).join(", ")}`,
      );
    }
  }
  lines.push(`TARGET LENGTH: ${brief.targetSeconds} seconds`);
  lines.push(`ASPECT RATIOS: ${brief.aspectRatios.join(", ")}`);
  lines.push(`NUMBER OF VARIANTS: ${brief.variantCount}`);
  if (brief.script && brief.script.variants.length) {
    lines.push(
      `SCRIPT (${brief.script.mode === "verbatim" ? "follow closely / word-for-word" : "adapt to the creator's tone"}):`,
    );
    brief.script.variants.forEach((s, i) => lines.push(`--- script ${i + 1} ---\n${s}`));
  }
  return lines.join("\n");
}

/**
 * A real-world sample brief (modeled on the Current banking-app brief) — used
 * for tests and demos. Note the compliance rules: "bank", "loan", "interest",
 * and "free overdraft" are forbidden in spoken copy even though the overview
 * uses the allowed phrase "banking app".
 */
export const SAMPLE_BRIEF: Brief = createBrief({
  brand: "Current",
  overview:
    "Current is a banking app designed to help you get more from your paycheck and manage money more flexibly.",
  primaryHook: "Access up to $750 of your paycheck early, once you qualify.",
  sellingPoints: [
    "Up to $750 Paycheck Advance once you qualify",
    "Build Card helps build credit (avg 80+ points in 6 months)",
    "Get paid up to 2 days faster with direct deposit",
    "Up to 4.00% bonus on savings pods",
    "24/7 live support",
  ],
  cta: "Sign up with my link or scan the QR code to get $75 — use my promo code.",
  description: {
    promoCode: "XXXXX",
    bonus: "$75",
    trackingLinkPlaceholder: "[FULL LINK]",
  },
  compliance: {
    do: [
      "Say 'banking app'",
      "Say 'once you qualify' / 'if you qualify' when mentioning Paycheck Advance",
    ],
    dont: [
      "Call it a bank",
      "Call Paycheck Advance a loan or credit",
      "Say 'free overdraft'",
      "Mention 'interest' when talking about Paycheck Advance",
    ],
    forbiddenTerms: ["bank", "loan", "free overdraft", "interest"],
    requiredDisclaimers: [
      "Current is a financial technology company, not an FDIC-insured bank",
    ],
  },
  script: {
    mode: "adapt",
    variants: [
      "If you've ever wished payday came sooner, this might actually help. There's a banking app called Current with a bunch of useful features, and one of the main ones lets you access up to $750 of your paychecks early if you qualify...",
    ],
  },
  referenceExamples: [
    "Survive 30 Days Chained To Your Ex, Win $250,000",
    "Exposing The Dark Money Controlling Sports",
  ],
  platform: "youtube",
  targetSeconds: 45,
  aspectRatios: ["16:9"],
  variantCount: 3,
});
