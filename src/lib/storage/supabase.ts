import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { StorageProvider, UploadTarget } from "./types";

/**
 * Supabase Storage. Uses the service-role key (server-only) to mint signed
 * upload URLs (browser → bucket directly) and signed read URLs (so ElevenLabs
 * Scribe can fetch the source via cloud_storage_url). Objects persist across
 * Railway redeploys.
 *
 * Required env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
 * Optional: SUPABASE_STORAGE_BUCKET (default "media"). Create the bucket once
 * in the Supabase dashboard (Storage → New bucket, private).
 */

let cached: SupabaseClient | null = null;
function client(): SupabaseClient {
  if (!cached) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new Error(
        "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set for STORAGE_PROVIDER=supabase.",
      );
    }
    cached = createClient(url, key, { auth: { persistSession: false } });
  }
  return cached;
}

function bucket(): string {
  return process.env.SUPABASE_STORAGE_BUCKET ?? "media";
}

export const supabaseStorage: StorageProvider = {
  name: "supabase",
  async createUploadUrl(key: string, contentType?: string): Promise<UploadTarget> {
    const { data, error } = await client().storage.from(bucket()).createSignedUploadUrl(key);
    if (error || !data) throw new Error(`createSignedUploadUrl failed: ${error?.message}`);
    return {
      url: data.signedUrl,
      method: "PUT",
      headers: contentType ? { "content-type": contentType } : undefined,
    };
  },
  async getReadUrl(key: string, expiresInSec = 3600): Promise<string> {
    const { data, error } = await client().storage.from(bucket()).createSignedUrl(key, expiresInSec);
    if (error || !data) throw new Error(`createSignedUrl failed: ${error?.message}`);
    return data.signedUrl;
  },
  async getBytes(key: string): Promise<Uint8Array> {
    const { data, error } = await client().storage.from(bucket()).download(key);
    if (error || !data) throw new Error(`download failed: ${error?.message}`);
    return new Uint8Array(await data.arrayBuffer());
  },
  async putBytes(key: string, bytes: Uint8Array, contentType?: string): Promise<void> {
    const { error } = await client()
      .storage.from(bucket())
      .upload(key, bytes, { contentType, upsert: true });
    if (error) throw new Error(`upload failed: ${error.message}`);
  },
};
