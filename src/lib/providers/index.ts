import type {
  AsrProvider,
  LlmProvider,
  RenderProvider,
  LipSyncProvider,
} from "./types";
import { mockAsr } from "./asr/mock";
import { elevenLabsAsr } from "./asr/elevenlabs";
import { mockLlm } from "./llm/mock";
import { anthropicLlm } from "./llm/anthropic";
import { mockRenderer } from "./render/mock";
import { shotstackRenderer } from "./render/shotstack";
import { creatomateRenderer } from "./render/creatomate";
import { mockLipSync } from "./lipsync/mock";

/**
 * Provider registry. Selects a concrete implementation from env vars, falling
 * back to mocks so the app runs with zero configuration. Wire real providers
 * by adding a case here and an implementation file alongside the mock.
 */

export function getAsrProvider(): AsrProvider {
  switch (process.env.ASR_PROVIDER) {
    case "elevenlabs":
      return elevenLabsAsr;
    // case "assemblyai": return assemblyAiAsr;
    // case "deepgram": return deepgramAsr;
    case "mock":
    default:
      return mockAsr;
  }
}

export function getLlmProvider(): LlmProvider {
  switch (process.env.LLM_PROVIDER) {
    case "anthropic":
      return anthropicLlm;
    // case "openai": return openAiLlm;
    case "mock":
    default:
      return mockLlm;
  }
}

export function getRenderProvider(): RenderProvider {
  switch (process.env.RENDER_PROVIDER) {
    case "shotstack":
      return shotstackRenderer;
    case "creatomate":
      return creatomateRenderer;
    // case "ffmpeg": return ffmpegRenderer;
    case "mock":
    default:
      return mockRenderer;
  }
}

export function getLipSyncProvider(): LipSyncProvider {
  switch (process.env.LIPSYNC_PROVIDER) {
    // case "synclabs": return syncLabsLipSync;
    // case "heygen": return heyGenLipSync;
    case "mock":
    default:
      return mockLipSync;
  }
}

export * from "./types";
