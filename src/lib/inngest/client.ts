import { Inngest } from "inngest";

/**
 * Inngest client — the durable job/orchestration layer. Reads INNGEST_EVENT_KEY
 * / INNGEST_SIGNING_KEY from the environment in production; in local dev the
 * Inngest Dev Server connects to /api/inngest.
 */
export const inngest = new Inngest({ id: "ai-ad-editor" });

/** Event that kicks off producing a finished cut for an uploaded asset. */
export type ProduceRequested = {
  name: "asset/produce.requested";
  data: { assetId: string };
};
