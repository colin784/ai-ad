/**
 * Storage seam. Object storage for source footage and rendered outputs, kept
 * behind an interface like the ASR/LLM/render providers. `local` writes to the
 * filesystem (dev); `supabase` uses a Supabase Storage bucket (persistent in
 * production — Railway's container disk is ephemeral).
 *
 * Uploads use a signed/direct URL so large files go browser → storage without
 * routing multi-GB through the Next.js server.
 */

export interface UploadTarget {
  /** Where the client uploads the bytes. */
  url: string;
  method: "PUT" | "POST";
  headers?: Record<string, string>;
}

export interface StorageProvider {
  readonly name: string;
  /** A URL the browser can upload the file to directly. */
  createUploadUrl(key: string, contentType?: string): Promise<UploadTarget>;
  /**
   * A URL a third party (e.g. ElevenLabs Scribe) can GET to fetch the object,
   * or null when the object isn't externally URL-addressable (local dev).
   */
  getReadUrl(key: string, expiresInSec?: number): Promise<string | null>;
  /** Read the object bytes (fallback when no read URL exists). */
  getBytes(key: string): Promise<Uint8Array>;
  /** Write bytes (used by the renderer to store outputs). */
  putBytes(key: string, bytes: Uint8Array, contentType?: string): Promise<void>;
}
