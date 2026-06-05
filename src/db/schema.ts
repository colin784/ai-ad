import { sql } from "drizzle-orm";
import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

/**
 * Core data model (per the scope of work, §6):
 *   Creator → Project → SourceAsset → Transcript → EditDecisionList
 *           → RenderJob → OutputVariant
 *
 * Notes:
 * - IDs are app-generated UUIDs (text) so they're stable across DB engines.
 * - JSON-shaped columns are stored as text and parsed/validated with Zod at
 *   the edges (see src/domain/edl.ts). SQLite has no native JSON column type.
 * - Timestamps are unix-epoch ms integers.
 */

const now = sql`(unixepoch() * 1000)`;

export const creators = sqliteTable("creators", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  handle: text("handle"),
  notes: text("notes"),
  createdAt: integer("created_at").notNull().default(now),
});

export const projects = sqliteTable("projects", {
  id: text("id").primaryKey(),
  creatorId: text("creator_id")
    .notNull()
    .references(() => creators.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  // Default creative brief for this project; can be overridden per analysis.
  brief: text("brief"),
  createdAt: integer("created_at").notNull().default(now),
});

/**
 * The pipeline state machine. A SourceAsset moves through these in order.
 * `failed` is terminal-until-retried and records which stage failed.
 * Keep in sync with src/domain/jobState.ts.
 */
export const ASSET_STATUSES = [
  "uploaded",
  "transcribing",
  "ready_for_analysis",
  "analyzed",
  "rendering",
  "review",
  "exported",
  "failed",
] as const;
export type AssetStatus = (typeof ASSET_STATUSES)[number];

export const sourceAssets = sqliteTable("source_assets", {
  id: text("id").primaryKey(),
  projectId: text("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  filename: text("filename").notNull(),
  // Key into object storage (local filesystem stands in during dev).
  storageKey: text("storage_key").notNull(),
  durationSeconds: real("duration_seconds"),
  sizeBytes: integer("size_bytes"),
  status: text("status", { enum: ASSET_STATUSES }).notNull().default("uploaded"),
  // Populated when status === "failed".
  failedStage: text("failed_stage"),
  errorMessage: text("error_message"),
  createdAt: integer("created_at").notNull().default(now),
  updatedAt: integer("updated_at").notNull().default(now),
});

export const transcripts = sqliteTable("transcripts", {
  id: text("id").primaryKey(),
  assetId: text("asset_id")
    .notNull()
    .references(() => sourceAssets.id, { onDelete: "cascade" }),
  // Structured transcript (words with timestamps + speakers) as JSON text.
  // Shape validated by TranscriptSchema in src/domain/edl.ts.
  content: text("content").notNull(),
  provider: text("provider").notNull(),
  createdAt: integer("created_at").notNull().default(now),
});

export const editDecisionLists = sqliteTable("edit_decision_lists", {
  id: text("id").primaryKey(),
  assetId: text("asset_id")
    .notNull()
    .references(() => sourceAssets.id, { onDelete: "cascade" }),
  variantId: text("variant_id").notNull(), // e.g. "hook-a"
  // Strict-JSON EDL consumed by the renderer. Validated by EdlSchema.
  payload: text("payload").notNull(),
  // True for the variant(s) a human approved for render/export.
  approved: integer("approved", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at").notNull().default(now),
});

export const RENDER_JOB_STATUSES = [
  "queued",
  "running",
  "succeeded",
  "failed",
] as const;
export type RenderJobStatus = (typeof RENDER_JOB_STATUSES)[number];

export const renderJobs = sqliteTable("render_jobs", {
  id: text("id").primaryKey(),
  edlId: text("edl_id")
    .notNull()
    .references(() => editDecisionLists.id, { onDelete: "cascade" }),
  aspectRatio: text("aspect_ratio").notNull(), // "9:16" | "1:1" | "16:9"
  status: text("status", { enum: RENDER_JOB_STATUSES })
    .notNull()
    .default("queued"),
  attempts: integer("attempts").notNull().default(0),
  errorMessage: text("error_message"),
  createdAt: integer("created_at").notNull().default(now),
  updatedAt: integer("updated_at").notNull().default(now),
});

export const outputVariants = sqliteTable("output_variants", {
  id: text("id").primaryKey(),
  renderJobId: text("render_job_id")
    .notNull()
    .references(() => renderJobs.id, { onDelete: "cascade" }),
  storageKey: text("storage_key").notNull(),
  aspectRatio: text("aspect_ratio").notNull(),
  durationSeconds: real("duration_seconds"),
  createdAt: integer("created_at").notNull().default(now),
});

export type Creator = typeof creators.$inferSelect;
export type Project = typeof projects.$inferSelect;
export type SourceAsset = typeof sourceAssets.$inferSelect;
export type Transcript = typeof transcripts.$inferSelect;
export type EditDecisionListRow = typeof editDecisionLists.$inferSelect;
export type RenderJob = typeof renderJobs.$inferSelect;
export type OutputVariant = typeof outputVariants.$inferSelect;
