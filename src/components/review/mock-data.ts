// Self-contained mock data for the review-editor prototype. No backend, no
// pipeline run required — this is what a transcribed + analyzed asset looks like
// once Scribe + Claude have done their work.

export type Sentence = {
  id: string;
  speaker: string;
  start: number;
  end: number;
  text: string;
};

export type Variant = {
  id: string;
  label: string;
  angle: string;
  hookId: string; // sentence chosen as the hook
  targetSeconds: number;
  order: string[]; // sentence ids, in cut order
};

export const ASPECT_RATIOS = ["9:16", "1:1", "16:9"] as const;
export type AspectRatio = (typeof ASPECT_RATIOS)[number];

// Words we treat as filler — highlighted, and trimmable via the toolbar toggle.
export const FILLER_WORDS = new Set([
  "um",
  "uh",
  "like",
  "basically",
  "honestly",
  "literally",
  "so",
  "you",
  "know",
  "just",
]);

export const PROJECT = {
  creator: "Jamie Rivera",
  handle: "@jamiemakes",
  project: "Summer Glow — Q3 push",
  asset: "jamie_raw_morning_routine.mp4",
  sourceDuration: 49.0,
};

export const TRANSCRIPT: Sentence[] = [
  { id: "s1", speaker: "Jamie", start: 0.0, end: 3.2, text: "Okay, I need to talk about my morning routine." },
  { id: "s2", speaker: "Jamie", start: 3.4, end: 7.1, text: "Um, so basically I used to spend like forty minutes every morning." },
  { id: "s3", speaker: "Jamie", start: 7.3, end: 11.0, text: "And honestly my skin still looked tired and dull." },
  { id: "s4", speaker: "Jamie", start: 11.2, end: 15.6, text: "Then I tried this one product for a week." },
  { id: "s5", speaker: "Jamie", start: 15.8, end: 18.9, text: "I stopped buying everything else after that." },
  { id: "s6", speaker: "Jamie", start: 19.1, end: 22.6, text: "The difference was night and day." },
  { id: "s7", speaker: "Jamie", start: 22.8, end: 26.4, text: "My routine went from forty minutes to about five." },
  { id: "s8", speaker: "Jamie", start: 26.6, end: 30.5, text: "Um, you know, I was super skeptical at first." },
  { id: "s9", speaker: "Jamie", start: 30.7, end: 34.6, text: "But the glow is real, I'm not exaggerating." },
  { id: "s10", speaker: "Jamie", start: 34.8, end: 38.2, text: "People at work literally asked what I changed." },
  { id: "s11", speaker: "Jamie", start: 38.4, end: 41.3, text: "So like if you're on the fence about it." },
  { id: "s12", speaker: "Jamie", start: 41.5, end: 44.2, text: "This is your sign to just try it." },
  { id: "s13", speaker: "Jamie", start: 44.4, end: 47.3, text: "Link's in my bio if you want to check it out." },
  { id: "s14", speaker: "Jamie", start: 47.5, end: 49.0, text: "Okay that's it, talk soon!" },
];

export const VARIANTS: Variant[] = [
  {
    id: "hook-a",
    label: "Hook A",
    angle: "Bold claim",
    hookId: "s5",
    targetSeconds: 60,
    order: ["s5", "s6", "s7", "s13"],
  },
  {
    id: "hook-b",
    label: "Hook B",
    angle: "Social proof",
    hookId: "s9",
    targetSeconds: 60,
    order: ["s9", "s10", "s4", "s13"],
  },
  {
    id: "hook-c",
    label: "Hook C",
    angle: "Problem → fix",
    hookId: "s3",
    targetSeconds: 60,
    order: ["s3", "s4", "s6", "s12", "s13"],
  },
];

export const SENTENCE_BY_ID: Record<string, Sentence> = Object.fromEntries(
  TRANSCRIPT.map((s) => [s.id, s]),
);

export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function sentenceDuration(id: string): number {
  const s = SENTENCE_BY_ID[id];
  return s ? s.end - s.start : 0;
}
