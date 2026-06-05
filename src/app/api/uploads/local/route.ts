import { NextResponse } from "next/server";
import { getStorageProvider } from "@/lib/storage";

export const runtime = "nodejs";

/**
 * PUT /api/uploads/local?key=<storageKey> — dev-only upload sink.
 * Writes the request body to the local storage dir. In production the browser
 * uploads directly to Supabase via a signed URL and never hits this route.
 */
export async function PUT(req: Request) {
  const key = new URL(req.url).searchParams.get("key");
  if (!key) return NextResponse.json({ error: "missing key" }, { status: 400 });

  try {
    const bytes = new Uint8Array(await req.arrayBuffer());
    await getStorageProvider().putBytes(key, bytes, req.headers.get("content-type") ?? undefined);
    return NextResponse.json({ ok: true, bytes: bytes.byteLength });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
