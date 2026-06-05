import type { AsrProvider, TranscribeInput } from "../types";
import type { TranscriptContent, Word } from "@/domain/edl";

const FILLERS = new Set(["um", "uh", "like", "you", "know", "so", "basically"]);

const SCRIPT = [
  "Okay so I want to tell you about this thing I tried.",
  "Um, basically I stopped buying these after one week.",
  "And honestly the difference was night and day.",
  "Like, I used to spend hours every single morning.",
  "Now it takes me five minutes, no joke.",
  "You know, I was skeptical at first too.",
  "But the results just speak for themselves here.",
  "So if you've been on the fence, this is your sign.",
  "Link in description if you want to check it out.",
];

/**
 * Deterministic fake ASR. Generates a plausible word-level transcript with
 * timestamps, a single speaker, and filler flags — enough to exercise the
 * LLM step and the review editor without any API key.
 */
export const mockAsr: AsrProvider = {
  name: "mock",
  async transcribe(_input: TranscribeInput): Promise<TranscriptContent> {
    const words: Word[] = [];
    let t = 0;
    const wordDur = 0.32;
    const segments: NonNullable<TranscriptContent["segments"]> = [];

    for (const line of SCRIPT) {
      const segStart = t;
      for (const raw of line.split(/\s+/)) {
        const clean = raw.replace(/[^a-z']/gi, "").toLowerCase();
        const start = t;
        const end = +(t + wordDur).toFixed(2);
        words.push({
          text: raw,
          start: +start.toFixed(2),
          end,
          speaker: "Speaker 1",
          isFiller: FILLERS.has(clean),
        });
        t = +(end + 0.05).toFixed(2);
      }
      segments.push({
        speaker: "Speaker 1",
        start: +segStart.toFixed(2),
        end: +t.toFixed(2),
        text: line,
      });
      t = +(t + 0.4).toFixed(2); // inter-sentence pause
    }

    return {
      language: "en",
      durationSeconds: +t.toFixed(2),
      words,
      segments,
    };
  },
};
