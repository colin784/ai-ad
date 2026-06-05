import path from "node:path";
import type { AsrProvider, TranscribeInput } from "../types";
import { TranscriptSchema, type TranscriptContent, type Word } from "@/domain/edl";
import { getStorageProvider } from "@/lib/storage";

/**
 * ElevenLabs Scribe — speech-to-text with word-level timestamps and speaker
 * diarization (scope §5.2). Implements the AsrProvider seam.
 *
 * Docs: https://elevenlabs.io/docs/api-reference/speech-to-text/convert
 * Endpoint: POST https://api.elevenlabs.io/v1/speech-to-text  (multipart)
 *
 * Scribe accepts common audio AND video formats (it extracts audio itself), so
 * we can hand it the source upload directly. For files already in cloud object
 * storage, pass an https URL as the storage key and we use `cloud_storage_url`
 * instead of uploading bytes.
 *
 * No SDK dependency — uses global fetch/FormData/Blob (Node 18+). The official
 * `@elevenlabs/elevenlabs-js` SDK is a drop-in alternative if preferred.
 */

const API_URL = "https://api.elevenlabs.io/v1/speech-to-text";
const MODEL_ID = "scribe_v1";

// Shape of the relevant parts of the Scribe response.
interface ScribeWord {
  text: string;
  start?: number;
  end?: number;
  type: "word" | "spacing" | "audio_event";
  speaker_id?: string;
}
interface ScribeResponse {
  language_code?: string;
  language_probability?: number;
  text: string;
  words?: ScribeWord[];
}

const FILLERS = new Set([
  "um",
  "uh",
  "er",
  "ah",
  "like",
  "basically",
  "literally",
  "actually",
]);

function isFillerWord(text: string): boolean {
  return FILLERS.has(text.replace(/[^a-z']/gi, "").toLowerCase());
}

export const elevenLabsAsr: AsrProvider = {
  name: "elevenlabs",
  async transcribe({ storageKey, languageHint }: TranscribeInput): Promise<TranscriptContent> {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      throw new Error(
        "ELEVENLABS_API_KEY is not set. Add it to .env (and set ASR_PROVIDER=elevenlabs).",
      );
    }

    const form = new FormData();
    form.append("model_id", MODEL_ID);
    form.append("diarize", "true");
    form.append("timestamps_granularity", "word");
    form.append("tag_audio_events", "false");
    if (languageHint) form.append("language_code", languageHint);

    if (/^https?:\/\//i.test(storageKey)) {
      // Already a fetchable URL — let Scribe pull it directly.
      form.append("cloud_storage_url", storageKey);
    } else {
      // Resolve the object via the storage layer. Supabase yields a signed read
      // URL (Scribe fetches it — best for large files); local dev returns null,
      // so we read the bytes and upload them multipart.
      const storage = getStorageProvider();
      const readUrl = await storage.getReadUrl(storageKey);
      if (readUrl) {
        form.append("cloud_storage_url", readUrl);
      } else {
        const bytes = await storage.getBytes(storageKey);
        // Re-wrap so the BlobPart is plainly ArrayBuffer-backed (TS lib quirk).
        form.append("file", new Blob([new Uint8Array(bytes)]), path.basename(storageKey));
      }
    }

    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "xi-api-key": apiKey },
      body: form,
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(`ElevenLabs Scribe failed (${res.status}): ${detail.slice(0, 500)}`);
    }

    const data = (await res.json()) as ScribeResponse;
    return mapScribeToTranscript(data, languageHint);
  },
};

/** Map a Scribe response to our internal TranscriptContent (validated). */
export function mapScribeToTranscript(
  data: ScribeResponse,
  languageHint?: string,
): TranscriptContent {
  const raw = data.words ?? [];

  // Keep only spoken words (drop spacing tokens and tagged audio events).
  const words: Word[] = raw
    .filter((w) => w.type === "word" && w.start != null && w.end != null)
    .map((w) => ({
      text: w.text,
      start: w.start as number,
      end: w.end as number,
      speaker: w.speaker_id,
      isFiller: isFillerWord(w.text),
    }));

  // Group consecutive words into sentence-ish segments, breaking on a speaker
  // change or terminal punctuation — gives the review editor clean chunks.
  const segments: NonNullable<TranscriptContent["segments"]> = [];
  let cur: { speaker?: string; start: number; end: number; parts: string[] } | null = null;
  const flush = () => {
    if (cur && cur.parts.length) {
      segments.push({
        speaker: cur.speaker,
        start: cur.start,
        end: cur.end,
        text: cur.parts.join(" ").replace(/\s+([.,!?])/g, "$1").trim(),
      });
    }
    cur = null;
  };
  for (const w of words) {
    if (!cur || cur.speaker !== w.speaker) {
      flush();
      cur = { speaker: w.speaker, start: w.start, end: w.end, parts: [] };
    }
    cur.parts.push(w.text);
    cur.end = w.end;
    if (/[.!?]$/.test(w.text.trim())) flush();
  }
  flush();

  const durationSeconds = words.length ? Math.max(...words.map((w) => w.end)) : 0;

  return TranscriptSchema.parse({
    language: data.language_code ?? languageHint ?? "en",
    durationSeconds,
    words,
    segments,
  });
}
