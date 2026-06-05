import type { LipSyncInput, LipSyncProvider, LipSyncResult } from "../types";

/**
 * Fake lip-sync (spec §6 / Pair 4). A real implementation (Sync Labs, HeyGen)
 * re-aligns the original footage to a regenerated voiceover track. The mock
 * just returns a deterministic output key so the rewrite pipeline is runnable.
 */
export const mockLipSync: LipSyncProvider = {
  name: "mock",
  async sync({ sourceStorageKey }: LipSyncInput): Promise<LipSyncResult> {
    const base = sourceStorageKey.split("/").pop()?.replace(/\.[^.]+$/, "") ?? "out";
    return { storageKey: `renders/${base}_lipsynced.mp4` };
  },
};
