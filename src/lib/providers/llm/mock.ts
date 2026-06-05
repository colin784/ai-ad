import type { AnalyzeInput, LlmProvider } from "../types";
import { EdlSchema, type Edl } from "@/domain/edl";

/**
 * Deterministic fake LLM analysis. Instead of calling a model, it picks the
 * most "hook-like" sentence segments from the transcript and assembles a few
 * variants. It still routes its output through EdlSchema.parse — exactly as a
 * real provider must — so the validation seam is exercised in dev.
 *
 * A real implementation (Anthropic / OpenAI) would prompt the model to emit
 * strict JSON, then validate + repair-retry against EdlSchema here.
 */
export const mockLlm: LlmProvider = {
  name: "mock",
  async analyze({ transcript, brief }: AnalyzeInput): Promise<Edl[]> {
    const segs = transcript.segments ?? [];
    if (segs.length === 0) throw new Error("Transcript has no segments to analyze");

    // Score sentences: prefer punchy, non-filler, opinion-y lines for hooks.
    const scored = segs.map((s, i) => {
      const wordCount = s.text.split(/\s+/).length;
      const hooky = /(stopped|difference|skeptical|night and day|five minutes|results)/i.test(
        s.text,
      )
        ? 3
        : 0;
      const brevity = wordCount <= 10 ? 1 : 0;
      return { i, s, score: hooky + brevity };
    });

    const ranked = [...scored].sort((a, b) => b.score - a.score);
    const ctaSeg = segs.find((s) => /link in description/i.test(s.text));

    const buildVariant = (variantId: string, hookIdx: number): Edl => {
      // Hook segment first, then the next couple of segments in source order,
      // plus the CTA at the end if present — keeping total under target.
      const chosen = new Set<number>([hookIdx]);
      for (let k = hookIdx + 1; k < segs.length && chosen.size < 3; k++) {
        if (!/link in description/i.test(segs[k].text)) chosen.add(k);
      }
      const ordered = [...chosen].sort((a, b) => a - b);
      const segments = ordered.map((idx) => ({
        sourceStart: segs[idx].start,
        sourceEnd: segs[idx].end,
        transcript: segs[idx].text,
      }));
      if (ctaSeg) {
        segments.push({
          sourceStart: ctaSeg.start,
          sourceEnd: ctaSeg.end,
          transcript: ctaSeg.text,
        });
      }

      return EdlSchema.parse({
        variantId,
        targetSeconds: brief.targetSeconds,
        aspectRatios: brief.aspectRatios,
        hookText: segs[hookIdx].text,
        segments,
        captions: "burn_in",
        cta: ctaSeg ? "Link in description" : undefined,
      } satisfies Partial<Edl>);
    };

    const count = Math.max(1, Math.min(brief.variantCount, ranked.length));
    const labels = ["hook-a", "hook-b", "hook-c", "hook-d"];
    return ranked
      .slice(0, count)
      .map((r, n) => buildVariant(labels[n] ?? `hook-${n}`, r.i));
  },
};
