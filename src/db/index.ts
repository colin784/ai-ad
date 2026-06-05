import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// Supabase Postgres. Use the transaction pooler connection string in
// production (port 6543) — `prepare: false` is required for that pooler.
// The client connects lazily, so an empty URL won't crash module load / build;
// it only fails when a query actually runs without DATABASE_URL set.
const url = process.env.DATABASE_URL ?? "";

// Bulletproofing: bound every connection so a slow/unreachable DB fails fast
// instead of hanging a request (a hung request reads as infinite "lag").
const client = postgres(url, {
  prepare: false, // required for Supabase's transaction pooler
  max: 5, // keep the pool small for the pooler
  idle_timeout: 20, // close idle conns after 20s
  connect_timeout: 10, // give up connecting after 10s
});

export const db = drizzle(client, { schema });
export { schema };
