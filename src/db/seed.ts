/**
 * Seed sample data so the app is explorable immediately.
 * Run with: npm run db:seed
 *
 * Loads dev env (.env) via tsx + Next is not involved here, so we read .env
 * ourselves through process.env (drizzle-kit / node already inline it when run
 * via the npm script with the file present).
 */
import { db } from "./index";
import { creators, projects, sourceAssets } from "./schema";
import { newId } from "../lib/id";

async function main() {
  console.log("Seeding…");

  // Clear existing rows (FK cascades handle children).
  await db.delete(creators);

  const creatorA = newId("cr");
  const creatorB = newId("cr");
  await db.insert(creators).values([
    { id: creatorA, name: "Jamie Rivera", handle: "@jamiemakes", notes: "Skincare & wellness" },
    { id: creatorB, name: "Devon Park", handle: "@devonbuilds", notes: "Gadgets & gear reviews" },
  ]);

  const projA = newId("pr");
  const projB = newId("pr");
  await db.insert(projects).values([
    {
      id: projA,
      creatorId: creatorA,
      name: "Summer Glow — Q3 push",
      brief: "30s hooks for Reels/TikTok. Punchy, first-person, results-focused. CTA: link in bio.",
    },
    {
      id: projB,
      creatorId: creatorB,
      name: "Desk Setup launch",
      brief: "Short-form ads highlighting the time-saving angle. Skeptic-to-believer arc.",
    },
  ]);

  await db.insert(sourceAssets).values([
    {
      // Real media present at ./storage/uploads/sample.mp3 — "Run pipeline" on
      // this asset performs a genuine ElevenLabs Scribe transcription.
      id: newId("as"),
      projectId: projA,
      filename: "jamie_sample_clip.mp3",
      storageKey: "uploads/sample.mp3",
      sizeBytes: 76_112,
      status: "uploaded",
    },
    {
      id: newId("as"),
      projectId: projA,
      filename: "jamie_unboxing_take2.mp4",
      storageKey: "uploads/jamie_unboxing_take2.mp4",
      sizeBytes: 1_800_000_000,
      status: "uploaded",
    },
    {
      id: newId("as"),
      projectId: projB,
      filename: "devon_desk_walkthrough.mp4",
      storageKey: "uploads/devon_desk_walkthrough.mp4",
      sizeBytes: 3_100_000_000,
      status: "uploaded",
    },
  ]);

  console.log("Done. 2 creators, 2 projects, 3 assets.");
  console.log("Open a project and click “Run pipeline” to exercise the loop.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
