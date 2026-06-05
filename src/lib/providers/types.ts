import type { Edl, TranscriptContent } from "@/domain/edl";
import type { AspectRatio } from "@/domain/edl";

/**
 * Provider seams. The scope of work calls for ASR, LLM, and render to be kept
 * vendor-swappable behind interfaces (§6 "Notes"). Application code depends
 * only on these contracts; concrete vendors (AssemblyAI, Deepgram, Anthropic,
 * OpenAI, ffmpeg, Remotion) implement them. The scaffold ships mocks so the
 * whole loop runs with no API keys.
 */

export interface TranscribeInput {
  /** Storage key / path to the source media. */
  storageKey: string;
  languageHint?: string;
}

export interface AsrProvider {
  readonly name: string;
  transcribe(input: TranscribeInput): Promise<TranscriptContent>;
}

// The creative brief that conditions the LLM analysis (§5.3) is a rich,
// structured object — see src/domain/brief.ts. Re-exported here so provider
// code keeps importing `Brief` from the providers barrel.
export type { Brief } from "@/domain/brief";

export interface AnalyzeInput {
  transcript: TranscriptContent;
  brief: import("@/domain/brief").Brief;
}

export interface LlmProvider {
  readonly name: string;
  /**
   * Returns one or more validated EDLs. Implementations MUST validate against
   * EdlSchema (and ideally repair-retry on failure) before returning.
   */
  analyze(input: AnalyzeInput): Promise<Edl[]>;
}

/**
 * Brand overlays the renderer must burn in, derived deterministically from the
 * brief (not the LLM). For long-form YouTube integrations the QR code and its
 * on-screen hold time are first-class requirements (e.g. "QR on screen 15-30s+,
 * brought in 5-10s into the read").
 */
export interface RenderOverlays {
  qr?: {
    minSeconds?: number; // keep on screen at least this long
    delaySeconds?: number; // bring it in this many seconds into the cut (absolute)
    appearAtPercent?: number; // …or at this % of the cut length (relative)
    position?: string; // e.g. "top-right"
  };
  endCardRequired?: boolean;
  promoCode?: string;
  disclaimers?: string[];
}

export interface RenderInput {
  edl: Edl;
  aspectRatio: AspectRatio;
  sourceStorageKey: string;
  overlays?: RenderOverlays;
}

export interface RenderResult {
  storageKey: string;
  durationSeconds: number;
}

export interface RenderProvider {
  readonly name: string;
  render(input: RenderInput): Promise<RenderResult>;
}
