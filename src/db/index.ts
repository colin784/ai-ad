import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// Supabase Postgres. Use the transaction pooler connection string in
// production (port 6543) — `prepare: false` is required for that pooler.
// The client connects lazily, so an empty URL won't crash module load / build;
// it only fails when a query actually runs without DATABASE_URL set.
const url = process.env.DATABASE_URL ?? "";

const client = postgres(url, { prepare: false });

export const db = drizzle(client, { schema });
export { schema };
