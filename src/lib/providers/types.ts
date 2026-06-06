import type { Edl, TranscriptContent } from "@/domain/edl";
import type { AspectRatio } from "@/domain/edl";
import type { OverlayCue } from "@/domain/graphics";

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

export interface RewriteInput {
  transcript: TranscriptContent;
  brief: import("@/domain/brief").Brief;
  targetSeconds: number;
}

export interface RewriteResult {
  /** New, tighter voiceover script (compliance-safe, length-bounded). */
  script: string;
  estimatedSeconds: number;
}

export interface LlmProvider {
  readonly name: string;
  /**
   * Returns one or more validated EDLs. Implementations MUST validate against
   * EdlSchema (and ideally repair-retry on failure) before returning.
   */
  analyze(input: AnalyzeInput): Promise<Edl[]>;
  /**
   * Optional (spec §6): rewrite the read into a tighter, safer core pitch at a
   * strict target length — removing skepticism-addressing dialogue and
   * high-dollar income claims — for the audio-replacement / lip-sync pipeline.
   */
  rewriteScript?(input: RewriteInput): Promise<RewriteResult>;
  /**
   * Parse a raw brief / script into a structured brand template (Brief).
   * Used when creating a brand from pasted/uploaded brief text.
   */
  parseBrief?(input: { text: string; name?: string }): Promise<import("@/domain/brief").Brief>;
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
    content?: string; // URL/text the QR encodes
  };
  endCardRequired?: boolean;
  promoCode?: string;
  disclaimers?: string[];
}

/** Output encoding spec (§1, §5). */
export interface RenderConfig {
  width: number; // e.g. 1920
  height: number; // e.g. 1080
  codec: "hevc" | "h264";
  upscaleFactor?: number; // computed from source height (720p→1.5, 540p→2.0)
  silencePaddingMs: number; // buffer around speech when removing silence
}

export interface RenderInput {
  edl: Edl;
  aspectRatio: AspectRatio;
  sourceStorageKey: string;
  overlays?: RenderOverlays;
  /** Keyword-triggered graphic overlays in output time (§2–§4). */
  cues?: OverlayCue[];
  /** Resolution / codec / upscale / silence settings (§1, §5). */
  config?: RenderConfig;
}

export interface RenderResult {
  storageKey: string;
  durationSeconds: number;
}

export interface RenderProvider {
  readonly name: string;
  render(input: RenderInput): Promise<RenderResult>;
}

/**
 * Lip-sync seam (spec §6 / Pair 4). When the audio is rewritten + regenerated,
 * a lip-sync model re-aligns the original footage to the new VO. Real impls:
 * Sync Labs, HeyGen.
 */
export interface LipSyncInput {
  sourceStorageKey: string;
  newAudioStorageKey: string;
}

export interface LipSyncResult {
  storageKey: string;
}

export interface LipSyncProvider {
  readonly name: string;
  sync(input: LipSyncInput): Promise<LipSyncResult>;
}
