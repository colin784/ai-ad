import {
  EdlSchema,
  type Edl,
  type SegmentRole,
  type TranscriptContent,
} from "./edl";
import type { Brief } from "./brief";

/**
 * Deterministic script → transcript alignment (Stage 2, no LLM).
 *
 * When a brand template includes the approved script, we don't need a model to
 * "decide what's good" — the creator read a known script, so we just match the
 * Scribe transcript (word-level timestamps) to that script and keep the spans
 * that were actually said, in script order. This is free, repeatable, and
 * compliance-safe (it can't drift from the approved copy).
 */

function norm(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9']+/g, "");
}

function splitSentences(script: string): string[] {
  return script
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

const CTA_CUE = /\b(scan|link|description|sign ?up|code|qr)\b/i;

function roleFor(sentence: string, index: number, promoCode?: string): SegmentRole {
  if (promoCode && sentence.toLowerCase().includes(promoCode.toLowerCase())) return "promo_code";
  if (CTA_CUE.test(sentence)) return "cta";
  if (index === 0) return "hook";
  return "benefit";
}

/**
 * Returns an EDL built by aligning `script` to the transcript, or null if too
 * little of the script could be matched (caller should fall back to the LLM).
 */
export function alignScriptToTranscript(
  transcript: TranscriptContent,
  script: string,
  brief: Brief,
): Edl | null {
  const words = (transcript.words ?? []).filter((w) => norm(w.text).length > 0);
  if (words.length === 0) return null;
  const wNorm = words.map((w) => norm(w.text));

  const sentences = splitSentences(script);
  if (sentences.length === 0) return null;

  const segments: Edl["segments"] = [];
  let cursor = 0;
  const LOOKAHEAD = 80; // how far ahead to search for each sentence
  let matchedSentences = 0;

  sentences.forEach((sentence, idx) => {
    const sTokens = sentence.split(/\s+/).map(norm).filter(Boolean);
    if (sTokens.length === 0) return;
    const sSet = new Set(sTokens);
    const k = sTokens.length;

    let bestScore = 0;
    let bestStart = -1;
    const maxStart = Math.min(words.length - 1, cursor + LOOKAHEAD);
    for (let start = cursor; start <= maxStart; start++) {
      const end = Math.min(words.length, start + k);
      let score = 0;
      for (let i = start; i < end; i++) if (sSet.has(wNorm[i])) score++;
      if (score > bestScore) {
        bestScore = score;
        bestStart = start;
      }
    }

    // Require at least half the sentence's words to appear in the window.
    if (bestStart >= 0 && bestScore / k >= 0.5) {
      const endIdx = Math.min(words.length - 1, bestStart + k - 1);
      segments.push({
        sourceStart: words[bestStart].start,
        sourceEnd: words[endIdx].end,
        transcript: sentence,
        role: roleFor(sentence, segments.length, brief.description?.promoCode),
      });
      cursor = endIdx + 1;
      matchedSentences++;
    }
  });

  // Need a meaningful chunk of the script to have actually been read.
  if (segments.length === 0 || matchedSentences / sentences.length < 0.4) return null;

  return EdlSchema.parse({
    variantId: "script-cut",
    targetSeconds: brief.targetSeconds,
    aspectRatios: brief.aspectRatios,
    hookText: brief.primaryHook || segments[0].transcript,
    segments,
    captions: "none",
    cta: brief.cta,
  });
}
