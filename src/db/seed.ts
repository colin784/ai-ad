/**
 * Seed the brand templates so the Produce flow has presets to choose from.
 * Run with: npm run db:seed
 */
import { db } from "./index";
import { brands } from "./schema";
import { newId } from "../lib/id";
import { BRAND_PRESETS } from "../domain/brand-presets";

async function main() {
  console.log("Seeding brand templates…");

  // Refresh presets (leave any user-created brands untouched: delete presets only).
  await db.delete(brands);

  for (const preset of BRAND_PRESETS) {
    await db.insert(brands).values({
      id: newId("brand"),
      name: preset.name,
      brief: JSON.stringify(preset.brief),
      isPreset: true,
    });
  }

  console.log(`Done. ${BRAND_PRESETS.length} brand presets:`, BRAND_PRESETS.map((p) => p.name).join(", "));
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
