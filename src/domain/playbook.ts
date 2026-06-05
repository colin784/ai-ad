/**
 * House-style conventions synthesized from a corpus of real long-form YouTube
 * brand integrations (Manus analysis: 9 clips — Freecash ×7, Current ×2,
 * Morgan & Morgan, Upside). This is the single source of truth for the learned
 * defaults the AI editor follows; the LLM prompt, brief defaults, render
 * config, and compliance checks all draw from here.
 */

// Mean observed length 78.7s, median 69.7s; recommendation: ~60s base,
// 75–90s when there's a promo-code walkthrough.
export const DEFAULT_INTEGRATION_SECONDS = 60;
export const PROMO_INTEGRATION_SECONDS = 80;
export const TARGET_SEGMENT_COUNT = 5;

// Burned-in captions were absent in ALL 9 integrations — the screen is kept
// clean for the QR code and app graphics.
export const DEFAULT_CAPTIONS = "none" as const;

export const QR_RULES = {
  appearAtPercent: 50, // introduce the QR around the 50% mark
  minHoldSeconds: 20, // hold at least 20s (app promos held 37–103s)
  defaultPosition: "top-right", // observed: right side / top-right most common
} as const;

export const SEGUE_IN_TEMPLATES = [
  "And before we dive back into the video, I want to tell you about {brand}...",
  "Quick thing before we continue — {brand}...",
  "If you {audience_qualifier}, you might want to stay for this real quick.",
];

export const SEGUE_OUT_TEMPLATES = [
  "All right, let's get back to the video.",
  "Now let's get right back to the video.",
];

export const ANTI_SKIP_DEFAULT =
  'Audience qualification — "If you [qualifier], you might want to stay" — highest retention at the lowest compliance risk.';

export const HOOK_ARCHETYPES = [
  "Bold claim / social proof",
  "Value promise / simplicity",
  "Skeptic disarm",
  "Audience callout / you",
];

// Per-role target lengths (seconds), for a ~60s, ~5-beat integration.
export const SEGMENT_LENGTH_GUIDELINES: Record<string, [number, number]> = {
  segue_in: [3, 6],
  hook: [5, 10],
  product_intro: [10, 15],
  how_it_works: [10, 15],
  benefit: [10, 15],
  proof: [10, 15],
  cta: [10, 15],
  segue_out: [2, 5],
};

export const GRAPHICS_TRIGGERS = [
  "Show the product graphic when the brand is first named.",
  "Show the QR code when 'scan the QR code' is first spoken (or at the 50% mark, whichever is earlier).",
  "Show the promo-code graphic when the promo code is spoken.",
  "Show a stat overlay when a specific percentage or dollar figure is mentioned.",
  "Overlay an app screen-share when 'let me show you' or 'when you open it up' is spoken.",
];

export const COMPLIANCE_DEFAULTS = [
  "Always add 'if you qualify' after any claim about advance pay or credit features.",
  "Use 'banking app', never 'bank', for fintech brands.",
  "Cap income claims with 'up to' or 'maybe even more' — never state guaranteed amounts.",
  "For gaming/rewards, include one expectation-management line (e.g. 'you're not going to get rich quick').",
];

// Phrases that make an income/earnings claim acceptably hedged.
export const INCOME_HEDGE_PHRASES = [
  "up to",
  "if you qualify",
  "maybe even more",
  "not going to get rich",
  "won't get rich",
  "results vary",
  "varies",
  "could",
  "can make",
  "can earn",
];

/** A constraint block for the LLM system prompt. */
export function renderPlaybookForPrompt(): string {
  return [
    `HOUSE STYLE — learned from real long-form YouTube brand integrations:`,
    `- Length: aim for ~${DEFAULT_INTEGRATION_SECONDS}s (about ${TARGET_SEGMENT_COUNT} beats, ~12s each); ${PROMO_INTEGRATION_SECONDS}s if there's a promo-code walkthrough. Front-load the value.`,
    `- Structure: open with a SEGUE-IN, then HOOK → PRODUCT INTRO / HOW IT WORKS → BENEFIT / PROOF → CTA (with QR), and close with a SEGUE-OUT. Tag every segment with its "role".`,
    `- Anti-skip opener: ${ANTI_SKIP_DEFAULT}`,
    `- Hook archetypes that work: ${HOOK_ARCHETYPES.join("; ")}.`,
    `- Segue-in options:\n${SEGUE_IN_TEMPLATES.map((t) => `    • ${t}`).join("\n")}`,
    `- Segue-out options:\n${SEGUE_OUT_TEMPLATES.map((t) => `    • ${t}`).join("\n")}`,
    `- Captions: do NOT burn in captions (set captions to "none") — keep the screen clean for the QR code and app graphics.`,
    `- QR: introduce around the ${QR_RULES.appearAtPercent}% mark, hold for at least ${QR_RULES.minHoldSeconds}s, positioned ${QR_RULES.defaultPosition}.`,
    `- Compliance defaults (in addition to the brief's own rules):\n${COMPLIANCE_DEFAULTS.map((c) => `    • ${c}`).join("\n")}`,
  ].join("\n");
}
