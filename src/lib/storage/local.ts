import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import type { StorageProvider, UploadTarget } from "./types";

/**
 * Filesystem storage for local dev. Uploads are routed through our own
 * /api/uploads/local PUT handler (no signed URLs locally). Not persistent on
 * Railway — use the supabase provider in production.
 */

function storageDir(): string {
  return process.env.STORAGE_DIR ?? "./storage";
}

function resolveSafe(key: string): string {
  if (key.includes("..")) throw new Error(`Unsafe storage key: ${key}`);
  return path.resolve(storageDir(), key);
}

export const localStorage: StorageProvider = {
  name: "local",
  async createUploadUrl(key: string): Promise<UploadTarget> {
    return { url: `/api/uploads/local?key=${encodeURIComponent(key)}`, method: "PUT" };
  },
  async getReadUrl(): Promise<string | null> {
    return null; // local files aren't externally fetchable
  },
  async getBytes(key: string): Promise<Uint8Array> {
    return new Uint8Array(await readFile(resolveSafe(key)));
  },
  async putBytes(key: string, bytes: Uint8Array): Promise<void> {
    const full = resolveSafe(key);
    await mkdir(path.dirname(full), { recursive: true });
    await writeFile(full, bytes);
  },
};

export { resolveSafe as resolveLocalKey };
