import { edlDuration, type Edl } from "./edl";
import type { Brief } from "./brief";
import { INCOME_HEDGE_PHRASES } from "./playbook";

/**
 * Deterministic compliance checks over a generated EDL's spoken copy.
 *
 * The LLM is told the rules, but we never trust it to follow them — every EDL
 * is re-checked here before it's accepted. Forbidden-term and over-length
 * failures are hard errors (they block the variant); missing CTA / promo code
 * are warnings. QR timing, end cards, and disclaimers are render-time / metadata
 * concerns and are reported as informational, not validated from the cut text.
 */

export type Severity = "error" | "warn" | "info";

export interface ComplianceCheck {
  id: string;
  label: string;
  ok: boolean;
  severity: Severity;
  detail?: string;
}

export interface ComplianceReport {
  ok: boolean; // true when there are no failing error-severity checks
  checks: ComplianceCheck[];
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Spoken copy of an EDL: hook + every kept segment + the CTA. */
export function edlCopy(edl: Edl): string {
  return [edl.hookText, ...edl.segments.map((s) => s.transcript), edl.cta ?? ""].join("\n");
}

/**
 * Find which forbidden terms appear in the text. Uses word-ish boundaries so
 * "bank" does NOT match "banking" — but a multi-word phrase ("free overdraft")
 * matches as a substring with boundaries on each end.
 */
export function findForbiddenTerms(text: string, terms: string[]): string[] {
  const hits: string[] = [];
  for (const raw of terms) {
    const term = raw.trim();
    if (!term) continue;
    const re = new RegExp(`(^|[^a-z0-9])${escapeRegExp(term.toLowerCase())}([^a-z0-9]|$)`, "i");
    if (re.test(text.toLowerCase())) hits.push(raw);
  }
  return hits;
}

const CTA_CUE =
  /(link in (the |my )?(description|bio)|scan( the)? (qr|code)|sign ?up|click the link|in (the |my )?description|promo code|use code)/i;

// An income/earnings claim: a dollar figure, "$X a day", or "make/earn $X".
const INCOME_CLAIM =
  /(\$\s?\d[\d,]*(\.\d+)?)|(\b\d+\s*(dollars|bucks)\b)|(\b(make|earn)s?\s+\$?\d)/i;

export function checkEdlCompliance(edl: Edl, brief: Brief): ComplianceReport {
  const copy = edlCopy(edl);
  const checks: ComplianceCheck[] = [];
  const compliance = brief.compliance;

  // 1. Forbidden terms (hard error)
  const forbidden = compliance?.forbiddenTerms ?? [];
  if (forbidden.length) {
    const hits = findForbiddenTerms(copy, forbidden);
    checks.push({
      id: "forbidden-terms",
      label: "No forbidden terms",
      ok: hits.length === 0,
      severity: "error",
      detail: hits.length ? `found forbidden term(s): ${hits.map((h) => `"${h}"`).join(", ")}` : undefined,
    });
  }

  // 2. Within target length (hard error, with 1s grace)
  const dur = edlDuration(edl);
  checks.push({
    id: "duration",
    label: "Within target length",
    ok: dur <= brief.targetSeconds + 1,
    severity: "error",
    detail: dur > brief.targetSeconds + 1 ? `${dur.toFixed(1)}s exceeds ${brief.targetSeconds}s target` : undefined,
  });

  // 3. Call to action present (warning)
  if (brief.cta || brief.description?.trackingLinkPlaceholder || brief.description?.promoCode) {
    checks.push({
      id: "cta",
      label: "Call to action present",
      ok: CTA_CUE.test(copy),
      severity: "warn",
      detail: CTA_CUE.test(copy) ? undefined : "no link/scan/sign-up cue found in the cut",
    });
  }

  // 4. Promo code spoken (warning)
  const promo = brief.description?.promoCode;
  if (promo) {
    const spoken = copy.toLowerCase().includes(promo.toLowerCase());
    checks.push({
      id: "promo-code",
      label: "Promo code spoken",
      ok: spoken,
      severity: "warn",
      detail: spoken ? undefined : `promo code "${promo}" not mentioned in the cut`,
    });
  }

  // 5. Income/earnings claims must be hedged (warning). The corpus' highest
  // compliance risk was an unhedged "$1,000 in two days" claim.
  if (INCOME_CLAIM.test(copy)) {
    const lower = copy.toLowerCase();
    const hedged = INCOME_HEDGE_PHRASES.some((h) => lower.includes(h));
    checks.push({
      id: "income-hedge",
      label: "Income claims hedged",
      ok: hedged,
      severity: "warn",
      detail: hedged
        ? undefined
        : "income/earnings claim without a hedge — add 'up to', 'if you qualify', or 'maybe even more'",
    });
  }

  // 6. Required disclaimers — informational (these belong in the description,
  // not necessarily the spoken cut).
  const disclaimers = compliance?.requiredDisclaimers ?? [];
  if (disclaimers.length) {
    const present = disclaimers.filter((d) => copy.toLowerCase().includes(d.toLowerCase()));
    checks.push({
      id: "disclaimers",
      label: "Required disclaimers",
      ok: true,
      severity: "info",
      detail:
        present.length === disclaimers.length
          ? "all disclaimers present in cut"
          : "ensure required disclaimer(s) appear in the video description",
    });
  }

  const ok = !checks.some((c) => c.severity === "error" && !c.ok);
  return { ok, checks };
}

/** Just the failing hard (error) checks — useful for repair feedback. */
export function complianceErrors(report: ComplianceReport): ComplianceCheck[] {
  return report.checks.filter((c) => c.severity === "error" && !c.ok);
}
