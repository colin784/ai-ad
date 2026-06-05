import type { AssetStatus } from "@/db/schema";

/**
 * Asset pipeline state machine (scope of work §5.1).
 *
 *   uploaded → transcribing → ready_for_analysis → analyzed
 *            → rendering → review → exported
 *
 * Any stage may transition to `failed`; a failed asset can be retried back to
 * the stage that failed. Centralising the allowed transitions here keeps the
 * orchestrator honest and makes illegal jumps a single guarded error.
 */
const TRANSITIONS: Record<AssetStatus, AssetStatus[]> = {
  uploaded: ["transcribing", "failed"],
  transcribing: ["ready_for_analysis", "failed"],
  ready_for_analysis: ["analyzed", "failed"],
  analyzed: ["rendering", "failed"],
  rendering: ["review", "failed"],
  review: ["rendering", "exported", "failed"], // re-render loop or export
  exported: ["rendering"], // re-open for another variant/edit
  failed: [
    // retry resumes at the stage that failed
    "transcribing",
    "ready_for_analysis",
    "analyzed",
    "rendering",
  ],
};

export function canTransition(from: AssetStatus, to: AssetStatus): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

export function assertTransition(from: AssetStatus, to: AssetStatus): void {
  if (!canTransition(from, to)) {
    throw new Error(`Illegal asset status transition: ${from} → ${to}`);
  }
}

export function nextStates(from: AssetStatus): AssetStatus[] {
  return TRANSITIONS[from] ?? [];
}

/** Ordered list of "happy path" stages for progress display. */
export const PIPELINE_STAGES: AssetStatus[] = [
  "uploaded",
  "transcribing",
  "ready_for_analysis",
  "analyzed",
  "rendering",
  "review",
  "exported",
];

const STAGE_LABELS: Record<AssetStatus, string> = {
  uploaded: "Uploaded",
  transcribing: "Transcribing",
  ready_for_analysis: "Ready for analysis",
  analyzed: "Analyzed",
  rendering: "Rendering",
  review: "In review",
  exported: "Exported",
  failed: "Failed",
};

export function statusLabel(status: AssetStatus): string {
  return STAGE_LABELS[status] ?? status;
}
