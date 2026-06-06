import { NextResponse } from "next/server";
import { db } from "@/db";
import { brands } from "@/db/schema";
import { newId } from "@/lib/id";
import { getLlmProvider } from "@/lib/providers";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * POST /api/brands — create a brand template from a pasted/uploaded brief.
 * Body: { text: string, name?: string }. Claude parses it into a structured
 * Brief (mock provider does a basic parse with no key).
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { text?: string; name?: string };
  const text = (body.text ?? "").trim();
  const name = body.name?.trim();
  if (!text) {
    return NextResponse.json({ error: "brief text is required" }, { status: 400 });
  }

  const llm = getLlmProvider();
  if (!llm.parseBrief) {
    return NextResponse.json(
      { error: `LLM provider "${llm.name}" can't parse briefs` },
      { status: 500 },
    );
  }

  try {
    const brief = await llm.parseBrief({ text, name });
    const id = newId("brand");
    const brandName = name || brief.brand || "Untitled brand";
    await db.insert(brands).values({
      id,
      name: brandName,
      brief: JSON.stringify(brief),
      sourceText: text,
      isPreset: false,
    });
    return NextResponse.json({ id, name: brandName });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
