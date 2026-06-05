import { randomUUID } from "node:crypto";

/** Short, URL-safe-ish unique id. Wraps crypto.randomUUID for one import site. */
export function newId(prefix?: string): string {
  const id = randomUUID();
  return prefix ? `${prefix}_${id}` : id;
}
