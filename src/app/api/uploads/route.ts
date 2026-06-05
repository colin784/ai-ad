import { NextResponse } from "next/server";
import path from "node:path";
import { db } from "@/db";
import { sourceAssets } from "@/db/schema";
import { newId } from "@/lib/id";
import { getStorageProvider } from "@/lib/storage";

export const runtime = "nodejs";

/**
 * POST /api/uploads — begin a footage upload.
 * Body: { projectId, filename, contentType?, sizeBytes? }
 *
 * Creates the SourceAsset row and returns a direct upload target. The browser
 * then uploads the bytes straight to storage (Supabase signed URL in prod, a
 * local PUT route in dev), so large files never pass through this server.
 */
export async function POST(req: Request) {
  let body: {
    projectId?: string;
    filename?: string;
    contentType?: string;
    sizeBytes?: number;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const { projectId, filename, contentType, sizeBytes } = body;
  if (!projectId || !filename) {
    return NextResponse.json({ error: "projectId and filename are required" }, { status: 400 });
  }

  const assetId = newId("as");
  const safeName = path.basename(filename).replace(/[^\w.\-]+/g, "_");
  const storageKey = `uploads/${assetId}/${safeName}`;

  try {
    await db.insert(sourceAssets).values({
      id: assetId,
      projectId,
      filename: safeName,
      storageKey,
      sizeBytes: typeof sizeBytes === "number" ? sizeBytes : null,
      status: "uploaded",
    });

    const upload = await getStorageProvider().createUploadUrl(storageKey, contentType);
    return NextResponse.json({ assetId, storageKey, upload });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
