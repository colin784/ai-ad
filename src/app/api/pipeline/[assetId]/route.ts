import { NextResponse } from "next/server";
import { z } from "zod";
import { runFullPipeline } from "@/lib/pipeline";
import { BriefSchema, createBrief } from "@/domain/brief";

// Inline execution can take a while; keep it off the edge runtime.
export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * POST /api/pipeline/:assetId — run the MVP loop for one asset.
 * Body (optional JSON): a partial Brief (see src/domain/brief.ts). Anything
 * omitted is filled with sensible defaults. With no body it falls back to a
 * minimal brief — fine for the mock providers.
 *
 * NOTE: this awaits the work inline for the scaffold/demo. Production should
 * enqueue a job and return 202 immediately (scope §6: never run transcription
 * or rendering inline in a web request).
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ assetId: string }> },
) {
  const { assetId } = await params;
  const body = await req.json().catch(() => ({}));
  const overrides = (BriefSchema.partial().safeParse(body).data ?? {}) as Partial<
    z.input<typeof BriefSchema>
  >;
  const brief = createBrief(overrides);

  try {
    await runFullPipeline(assetId, brief);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
