import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { sourceAssets } from "@/db/schema";
import {
  briefForAsset,
  runFullPipeline,
  collectVariants,
} from "@/lib/pipeline";
import { inngest } from "@/lib/inngest/client";

export const runtime = "nodejs";
export const maxDuration = 120;

const USE_INNGEST = process.env.USE_INNGEST === "true";

/**
 * POST /api/produce — turn uploaded footage into finished cut(s).
 * Body: { assetId }.
 *
 * Production (USE_INNGEST=true): enqueues a durable job and returns immediately
 * (202) — the client polls /api/produce/status. Fallback (no Inngest): runs the
 * pipeline inline and returns the variants, so the app works without queue infra.
 */
export async function POST(req: Request) {
  const { assetId } = (await req.json().catch(() => ({}))) as { assetId?: string };
  if (!assetId) {
    return NextResponse.json({ error: "assetId is required" }, { status: 400 });
  }

  const [asset] = await db.select().from(sourceAssets).where(eq(sourceAssets.id, assetId)).limit(1);
  if (!asset) return NextResponse.json({ error: "asset not found" }, { status: 404 });

  if (USE_INNGEST) {
    await inngest.send({ name: "asset/produce.requested", data: { assetId } });
    return NextResponse.json({ queued: true, assetId }, { status: 202 });
  }

  // Inline fallback.
  try {
    const brief = await briefForAsset(assetId);
    await runFullPipeline(assetId, brief);
    return NextResponse.json({ ok: true, variants: await collectVariants(assetId) });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
