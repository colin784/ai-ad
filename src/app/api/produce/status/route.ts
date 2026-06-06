import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { sourceAssets } from "@/db/schema";
import { collectVariants } from "@/lib/pipeline";

export const runtime = "nodejs";

/**
 * GET /api/produce/status?assetId=… — poll an asset's pipeline status. When it
 * reaches review/exported, returns the produced variants; on failure, the error.
 */
export async function GET(req: Request) {
  const assetId = new URL(req.url).searchParams.get("assetId");
  if (!assetId) return NextResponse.json({ error: "assetId required" }, { status: 400 });

  const [asset] = await db.select().from(sourceAssets).where(eq(sourceAssets.id, assetId)).limit(1);
  if (!asset) return NextResponse.json({ error: "asset not found" }, { status: 404 });

  const done = asset.status === "review" || asset.status === "exported";
  return NextResponse.json({
    status: asset.status,
    failedStage: asset.failedStage,
    error: asset.errorMessage,
    variants: done ? await collectVariants(assetId) : undefined,
  });
}
