import { defineConfig } from "drizzle-kit";

// `turso` dialect drives the libSQL client and accepts local `file:` URLs,
// so the same schema works locally (file) and against Turso/libSQL in prod.
export default defineConfig({
  dialect: "turso",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "file:local.db",
  },
});
