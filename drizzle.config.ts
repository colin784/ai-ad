import { defineConfig } from "drizzle-kit";

// Postgres (Supabase). Set DATABASE_URL in the shell before running db:* —
// e.g. the Supabase "Connection string" (transaction pooler, port 6543).
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
  },
});
