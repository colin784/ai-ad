import type { StorageProvider } from "./types";
import { localStorage } from "./local";
import { supabaseStorage } from "./supabase";

/** Select the storage backend from STORAGE_PROVIDER (default local). */
export function getStorageProvider(): StorageProvider {
  switch (process.env.STORAGE_PROVIDER) {
    case "supabase":
      return supabaseStorage;
    case "local":
    default:
      return localStorage;
  }
}

export * from "./types";
