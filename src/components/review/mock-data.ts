// Self-contained mock data for the review-editor prototype — modeled on a real
// long-form YouTube brand integration (per the Manus corpus analysis): 16:9,
// ~75s, segue-in → hook → product → how-it-works → benefit/proof → CTA + QR +
// promo → segue-out, and NO burned-in captions (clean screen for the QR).

export type SegmentRole =
  | "segue_in"
  | "hook"
  | "product_intro"
  | "how_it_works"
  | "benefit"
  | "proof"
  | "objection_handling"
  | "cta"
  | "promo_code"
  | "segue_out";

export type Sentence = {
  id: string;
  speaker: string;
  start: number;
  end: number;
  text: string;
  role: SegmentRole;
};

export type Variant = {
  id: string;
  label: string;
  angle: string;
  hookId: string;
  targetSeconds: number;
  order: string[];
};

export const ASPECT_RATIOS = ["9:16", "1:1", "16:9"] as const;
export type AspectRatio = (typeof ASPECT_RATIOS)[number];

export const ROLE_LABELS: Record<SegmentRole, string> = {
  segue_in: "Segue in",
  hook: "Hook",
  product_intro: "Product",
  how_it_works: "How it works",
  benefit: "Benefit",
  proof: "Proof",
  objection_handling: "Objection",
  cta: "CTA",
  promo_code: "Promo",
  segue_out: "Segue out",
};

export const FILLER_WORDS = new Set([
  "um",
  "uh",
  "like",
  "honestly",
  "literally",
  "basically",
  "just",
  "kind",
  "of",
]);

export const PROJECT = {
  creator: "Berto",
  handle: "@berto",
  project: "Current — paycheck advance integration",
  asset: "berto_current_read_raw.mp4",
  sourceDuration: 92.0,
  // QR appears around the 50% mark and holds to the end (learned norm).
  qrAppearPercent: 0.5,
};

export const TRANSCRIPT: Sentence[] = [
  { id: "s1", speaker: "Berto", start: 0.0, end: 4.6, role: "segue_in", text: "Real quick before we get back into the video, I gotta put you on to something." },
  { id: "s2", speaker: "Berto", start: 4.8, end: 9.9, role: "hook", text: "If you have a job and you like getting paid, you might wanna stay for this." },
  { id: "s3", speaker: "Berto", start: 10.1, end: 15.4, role: "product_intro", text: "It's a banking app called Current, and it kind of changed how I handle my money." },
  { id: "s4", speaker: "Berto", start: 15.6, end: 21.2, role: "benefit", text: "The main thing is you can access up to $750 of your paycheck early, if you qualify." },
  { id: "s5", speaker: "Berto", start: 21.4, end: 27.6, role: "how_it_works", text: "Let me show you — when you open it up you just connect your direct deposit and that's basically it." },
  { id: "s6", speaker: "Berto", start: 27.8, end: 33.2, role: "benefit", text: "It's also got fee-free overdraft and a card that helps you build credit over time." },
  { id: "s7", speaker: "Berto", start: 33.4, end: 38.6, role: "proof", text: "I've been using it for a few months and honestly it's just less stressful around payday." },
  { id: "s8", speaker: "Berto", start: 38.8, end: 44.0, role: "objection_handling", text: "And no, it's not too good to be true — it's a banking app, your money's FDIC insured through their partner banks." },
  { id: "s9", speaker: "Berto", start: 44.2, end: 49.6, role: "cta", text: "So if you wanna check it out, scan the QR code on screen or hit the first link in my description." },
  { id: "s10", speaker: "Berto", start: 49.8, end: 55.0, role: "promo_code", text: "Use my code and you'll get a $75 bonus when you set up your direct deposit." },
  { id: "s11", speaker: "Berto", start: 55.2, end: 59.4, role: "benefit", text: "It takes like two minutes to sign up, so do it now before you forget." },
  { id: "s12", speaker: "Berto", start: 59.6, end: 63.2, role: "segue_out", text: "Alright, let's get right back into the video." },
  // Alternate openers used by other variants:
  { id: "s13", speaker: "Berto", start: 63.4, end: 69.2, role: "hook", text: "Most money apps you see online are overhyped, but this is one I actually use myself." },
  { id: "s14", speaker: "Berto", start: 69.4, end: 74.2, role: "hook", text: "This app literally pays you early — up to $750 before payday, if you qualify." },
];

export const VARIANTS: Variant[] = [
  {
    id: "hook-a",
    label: "Hook A",
    angle: "Audience qualification",
    hookId: "s2",
    targetSeconds: 75,
    order: ["s1", "s2", "s3", "s4", "s5", "s9", "s10", "s12"],
  },
  {
    id: "hook-b",
    label: "Hook B",
    angle: "Skeptic disarm",
    hookId: "s13",
    targetSeconds: 75,
    order: ["s1", "s13", "s3", "s6", "s7", "s9", "s10", "s12"],
  },
  {
    id: "hook-c",
    label: "Hook C",
    angle: "Bold value",
    hookId: "s14",
    targetSeconds: 75,
    order: ["s14", "s4", "s5", "s8", "s9", "s10", "s12"],
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
