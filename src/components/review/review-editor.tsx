"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Pause, Play, X } from "lucide-react";
import {
  ASPECT_RATIOS,
  FILLER_WORDS,
  PROJECT,
  ROLE_LABELS,
  SENTENCE_BY_ID,
  TRANSCRIPT,
  VARIANTS,
  formatTime,
  sentenceDuration,
  type AspectRatio,
} from "./mock-data";
import {
  Chip,
  PrimaryButton,
  SecondaryButton,
  ProgressBar,
  SectionLabel,
  palette,
  mono,
} from "@/components/panel-ui";
import { deriveCues, type OverlayCue, type OverlayPosition } from "@/domain/graphics";

type Status = "approved" | "rejected" | null;
type VariantState = { order: string[]; status: Status };

const FILLER_TRIM_PER_WORD = 0.28; // seconds shaved per filler word when trimming

function cleanWord(w: string) {
  return w.replace(/[^a-z']/gi, "").toLowerCase();
}

export function ReviewEditor() {
  const [activeId, setActiveId] = useState(VARIANTS[0].id);
  const [variantState, setVariantState] = useState<Record<string, VariantState>>(
    () =>
      Object.fromEntries(
        VARIANTS.map((v) => [v.id, { order: [...v.order], status: null }]),
      ),
  );
  const [aspect, setAspect] = useState<AspectRatio>("16:9");
  const [trimFillers, setTrimFillers] = useState(true);
  const [hideRemoved, setHideRemoved] = useState(false);
  const [rendering, setRendering] = useState(false);
  const [renderedAt, setRenderedAt] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);

  // Mock playback
  const [playing, setPlaying] = useState(false);
  const [playIndex, setPlayIndex] = useState(0);

  const variant = VARIANTS.find((v) => v.id === activeId)!;
  const state = variantState[activeId];
  const order = state.order;
  const includedSet = useMemo(() => new Set(order), [order]);

  const fillerCount = useMemo(
    () =>
      order.reduce((n, id) => {
        const words = SENTENCE_BY_ID[id].text.split(/\s+/);
        return n + words.filter((w) => FILLER_WORDS.has(cleanWord(w))).length;
      }, 0),
    [order],
  );

  const rawDuration = useMemo(
    () => order.reduce((sum, id) => sum + sentenceDuration(id), 0),
    [order],
  );
  const duration = trimFillers
    ? Math.max(0, rawDuration - fillerCount * FILLER_TRIM_PER_WORD)
    : rawDuration;
  const overTarget = duration > variant.targetSeconds;

  // Reset/clamp playback when the cut changes
  useEffect(() => {
    setPlaying(false);
    setPlayIndex(0);
  }, [activeId]);
  useEffect(() => {
    if (playIndex >= order.length) setPlayIndex(0);
  }, [order.length, playIndex]);

  useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => {
      setPlayIndex((i) => {
        if (i >= order.length - 1) {
          setPlaying(false);
          return i;
        }
        return i + 1;
      });
    }, 1500);
    return () => clearInterval(t);
  }, [playing, order.length]);

  function updateOrder(next: string[]) {
    setVariantState((s) => ({ ...s, [activeId]: { ...s[activeId], order: next } }));
  }
  function setStatus(status: Status) {
    setVariantState((s) => ({ ...s, [activeId]: { ...s[activeId], status } }));
  }

  function toggleSentence(id: string) {
    if (includedSet.has(id)) {
      updateOrder(order.filter((x) => x !== id));
    } else {
      const origIndex = (x: string) => TRANSCRIPT.findIndex((s) => s.id === x);
      const next = [...order];
      const pos = next.findIndex((x) => origIndex(x) > origIndex(id));
      if (pos === -1) next.push(id);
      else next.splice(pos, 0, id);
      updateOrder(next);
    }
  }

  function onDrop(targetId: string) {
    if (!dragId || dragId === targetId) return;
    const next = [...order];
    const from = next.indexOf(dragId);
    const to = next.indexOf(targetId);
    next.splice(from, 1);
    next.splice(to, 0, dragId);
    updateOrder(next);
    setDragId(null);
  }

  function reRender() {
    setRendering(true);
    setRenderedAt(null);
    setTimeout(() => {
      setRendering(false);
      const d = new Date();
      setRenderedAt(
        `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`,
      );
    }, 1600);
  }

  const aspectCss = aspect === "9:16" ? "9 / 16" : aspect === "1:1" ? "1 / 1" : "16 / 9";
  const elapsed = order.slice(0, playIndex).reduce((s, id) => s + sentenceDuration(id), 0);
  const captionId = order[playIndex] ?? order[0];
  const captionText = captionId ? SENTENCE_BY_ID[captionId].text : "";
  const currentRole = captionId ? SENTENCE_BY_ID[captionId].role : undefined;

  // Keyword-triggered graphic overlays (spec §2–§4), derived from the cut.
  const cues = useMemo(
    () =>
      deriveCues(
        order.map((id) => ({
          transcript: SENTENCE_BY_ID[id].text,
          durationSeconds: sentenceDuration(id),
        })),
        { brandName: PROJECT.brand },
      ),
    [order],
  );
  // Active when the playhead is inside the cue; at rest, show all so the graphics
  // are visible. One per asset (first wins) to avoid stacking duplicates.
  const activeCues = useMemo(() => {
    const within = cues.filter(
      (c) => !playing || (elapsed >= c.startSeconds && elapsed <= c.endSeconds),
    );
    const seen = new Set<string>();
    return within.filter((c) => (seen.has(c.asset) ? false : (seen.add(c.asset), true)));
  }, [cues, playing, elapsed]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        background: palette.pageBg,
      }}
    >
      {/* Top bar */}
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          padding: "14px 24px",
          borderBottom: `1px solid ${palette.border}`,
          background: palette.panelBg,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <Link
            href="/"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 8px",
              borderRadius: 4,
              color: palette.secondary,
              fontSize: 12,
              fontWeight: 600,
              textDecoration: "none",
              transition: "color 120ms",
            }}
          >
            <ArrowLeft size={12} />
            Back
          </Link>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: palette.titleText }}>
              {PROJECT.project}
            </div>
            <div style={{ marginTop: 2, fontSize: 11, color: palette.tertiary }}>
              {PROJECT.creator} · {PROJECT.asset}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <AspectToggle aspect={aspect} onChange={setAspect} />
          <PrimaryButton onClick={reRender} disabled={rendering}>
            {rendering ? "Rendering" : "Re-render"}
          </PrimaryButton>
        </div>
      </header>

      {/* Variant tabs */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 4,
          padding: "10px 24px",
          borderBottom: `1px solid ${palette.border}`,
          background: palette.panelBg,
        }}
      >
        <div
          style={{
            display: "flex",
            padding: 4,
            gap: 4,
            background: palette.pageBg,
            border: `1px solid ${palette.subBorder}`,
            borderRadius: 6,
          }}
        >
          {VARIANTS.map((v) => {
            const st = variantState[v.id];
            const dur = st.order.reduce((s, id) => s + sentenceDuration(id), 0);
            const active = v.id === activeId;
            return (
              <button
                key={v.id}
                onClick={() => setActiveId(v.id)}
                style={{
                  padding: "7px 14px",
                  borderRadius: 4,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  background: active ? "rgba(74,222,128,0.12)" : "transparent",
                  color: active ? palette.accent : palette.secondary,
                  border: `1px solid ${active ? "rgba(74,222,128,0.35)" : "transparent"}`,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  transition: "color 120ms, background 120ms, border-color 120ms",
                }}
              >
                <span>{v.label}</span>
                <span style={{ color: palette.tertiary, fontWeight: 500 }}>{v.angle}</span>
                <span style={{ color: palette.tertiary, fontFamily: mono }}>
                  · {dur.toFixed(0)}s
                </span>
                {st.status === "approved" && (
                  <Dot color={palette.accent} />
                )}
                {st.status === "rejected" && (
                  <Dot color={palette.destructive} />
                )}
              </button>
            );
          })}
        </div>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
          <SecondaryButton
            onClick={() => setStatus(state.status === "rejected" ? null : "rejected")}
            style={
              state.status === "rejected"
                ? {
                    color: palette.destructive,
                    borderColor: "rgba(248,113,113,0.4)",
                  }
                : undefined
            }
          >
            {state.status === "rejected" ? "Rejected" : "Reject"}
          </SecondaryButton>
          <button
            onClick={() => setStatus(state.status === "approved" ? null : "approved")}
            style={{
              padding: "8px 16px",
              borderRadius: 4,
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
              background:
                state.status === "approved"
                  ? "rgba(74,222,128,0.18)"
                  : "rgba(74,222,128,0.10)",
              color: palette.accent,
              border: "1px solid rgba(74,222,128,0.35)",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              transition: "background 120ms",
            }}
          >
            {state.status === "approved" && <Check size={12} />}
            {state.status === "approved" ? "Approved" : "Approve"}
          </button>
        </div>
      </div>

      {/* Main */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.15fr 1fr",
          flex: 1,
          overflow: "hidden",
        }}
      >
        {/* Transcript editor */}
        <section
          style={{
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            borderRight: `1px solid ${palette.border}`,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "14px 24px",
              gap: 12,
            }}
          >
            <div>
              <SectionLabel>Transcript</SectionLabel>
              <div style={{ marginTop: 4, fontSize: 11, color: palette.tertiary }}>
                Click a line to keep or cut it — removing a line removes that moment from the
                video.
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 11 }}>
              <Toggle label="Trim fillers" checked={trimFillers} onChange={setTrimFillers} />
              <Toggle label="Hide removed" checked={hideRemoved} onChange={setHideRemoved} />
            </div>
          </div>
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "0 16px 24px",
              display: "flex",
              flexDirection: "column",
              gap: 2,
            }}
          >
            {TRANSCRIPT.map((s) => {
              const included = includedSet.has(s.id);
              if (!included && hideRemoved) return null;
              const isHook = s.id === variant.hookId;
              const isPlaying = included && order[playIndex] === s.id && playing;
              return (
                <button
                  key={s.id}
                  onClick={() => toggleSentence(s.id)}
                  style={{
                    display: "flex",
                    gap: 12,
                    width: "100%",
                    textAlign: "left",
                    padding: "8px 12px",
                    borderLeft: `2px solid ${included ? palette.accent : "transparent"}`,
                    borderRight: "none",
                    borderTop: "none",
                    borderBottom: "none",
                    background: included ? "rgba(255,255,255,0.02)" : "transparent",
                    opacity: included ? 1 : 0.45,
                    borderRadius: 4,
                    cursor: "pointer",
                    transition: "background 120ms, opacity 120ms",
                    outline: isPlaying ? `1px solid rgba(74,222,128,0.5)` : "none",
                  }}
                >
                  <span
                    style={{
                      marginTop: 2,
                      display: "flex",
                      flexDirection: "column",
                      gap: 4,
                      width: 76,
                      flexShrink: 0,
                    }}
                  >
                    <span style={{ fontFamily: mono, fontSize: 11, color: palette.faint }}>
                      {formatTime(s.start)}
                    </span>
                    <Chip
                      color={isHook ? palette.tagAmber : palette.tagGray}
                      style={{
                        fontSize: 9,
                        padding: "1px 6px",
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                        justifyContent: "center",
                      }}
                    >
                      {ROLE_LABELS[s.role]}
                    </Chip>
                  </span>
                  <span
                    style={{
                      fontSize: 13,
                      lineHeight: 1.6,
                      color: included ? palette.strongText : palette.tertiary,
                      textDecoration: included ? "none" : "line-through",
                    }}
                  >
                    {renderWords(s.text, trimFillers && included)}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Preview + timeline */}
        <section style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: 24,
              overflow: "hidden",
            }}
          >
            {/* Preview frame */}
            <div
              style={{
                position: "relative",
                height: "46vh",
                maxHeight: "46vh",
                aspectRatio: aspectCss,
                overflow: "hidden",
                borderRadius: 6,
                background: "#000",
                border: `1px solid ${palette.controlBorder}`,
              }}
            >
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background: "linear-gradient(135deg, #0d0d0d 0%, #1a1a1a 100%)",
                }}
              />
              {/* current beat chip (editor overlay — not burned into the video) */}
              <div style={{ position: "absolute", left: 0, top: 0, padding: 12 }}>
                <Chip
                  color={palette.tagGray}
                  style={{
                    background: "rgba(0,0,0,0.55)",
                    borderColor: "rgba(255,255,255,0.12)",
                    color: palette.strongText,
                    fontSize: 10,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                  }}
                >
                  {currentRole ? ROLE_LABELS[currentRole] : "—"}
                </Chip>
              </div>
              {/* Keyword-triggered graphic overlays (spec §2–§4) */}
              {activeCues.map((cue) => (
                <CueOverlay key={cue.asset + cue.startSeconds} cue={cue} />
              ))}
              {/* spoken line — editor reference only; captions NOT burned in */}
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  bottom: 48,
                  padding: "0 20px",
                  textAlign: "center",
                }}
              >
                <div
                  style={{
                    margin: "0 auto",
                    maxWidth: "90%",
                    fontSize: 12,
                    fontStyle: "italic",
                    color: "rgba(255,255,255,0.55)",
                    lineHeight: 1.5,
                  }}
                >
                  {captionText}
                </div>
              </div>
              {/* play button */}
              <button
                onClick={() => setPlaying((p) => !p)}
                aria-label={playing ? "Pause" : "Play"}
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    height: 56,
                    width: 56,
                    borderRadius: "50%",
                    background: "rgba(0,0,0,0.55)",
                    color: "#fff",
                    transition: "background 120ms",
                  }}
                >
                  {playing ? <Pause size={20} /> : <Play size={20} />}
                </span>
              </button>
              {/* scrubber */}
              <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: 12 }}>
                <div
                  style={{
                    height: 3,
                    width: "100%",
                    background: "rgba(255,255,255,0.15)",
                    borderRadius: 2,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${duration ? Math.min(100, (elapsed / duration) * 100) : 0}%`,
                      background: "#fff",
                      transition: "width 200ms",
                    }}
                  />
                </div>
                <div
                  style={{
                    marginTop: 4,
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 10,
                    color: "rgba(255,255,255,0.7)",
                    fontFamily: mono,
                  }}
                >
                  <span>{formatTime(elapsed)}</span>
                  <span style={{ fontFamily: mono }}>{aspect}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>
            </div>

            {renderedAt && !rendering && (
              <div
                style={{
                  marginTop: 12,
                  padding: "6px 12px",
                  background: "rgba(74,222,128,0.10)",
                  color: palette.accent,
                  border: "1px solid rgba(74,222,128,0.25)",
                  borderRadius: 4,
                  fontSize: 11,
                  fontWeight: 600,
                }}
              >
                Rendered {ASPECT_RATIOS.length} formats at{" "}
                <span style={{ fontFamily: mono }}>{renderedAt}</span>
              </div>
            )}
          </div>

          {/* Timeline */}
          <div
            style={{
              borderTop: `1px solid ${palette.border}`,
              padding: "16px 24px",
              background: palette.panelBg,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 10,
              }}
            >
              <SectionLabel>Cut timeline</SectionLabel>
              <div style={{ fontSize: 11, fontFamily: mono }}>
                <span style={{ color: overTarget ? palette.destructive : palette.strongText }}>
                  {duration.toFixed(1)}s
                </span>
                <span style={{ color: palette.tertiary }}>
                  {" / "}
                  {variant.targetSeconds}s target
                </span>
              </div>
            </div>
            <div style={{ marginBottom: 14 }}>
              <ProgressBar
                pct={(duration / variant.targetSeconds) * 100}
                color={overTarget ? palette.destructive : palette.accent}
              />
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {order.map((id, i) => (
                <div
                  key={id}
                  draggable
                  onDragStart={() => setDragId(id)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => onDrop(id)}
                  title="Drag to reorder"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    maxWidth: 180,
                    padding: "6px 8px",
                    borderRadius: 4,
                    background: palette.subCardBg,
                    border: `1px solid ${palette.subBorder2}`,
                    cursor: "grab",
                    opacity: dragId === id ? 0.4 : 1,
                  }}
                >
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: palette.faint,
                      fontFamily: mono,
                    }}
                  >
                    {i + 1}
                  </span>
                  <Chip
                    color={palette.tagGray}
                    style={{
                      fontSize: 9,
                      padding: "1px 5px",
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                    }}
                  >
                    {ROLE_LABELS[SENTENCE_BY_ID[id].role]}
                  </Chip>
                  <span
                    style={{
                      flex: 1,
                      fontSize: 11,
                      color: palette.body,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {SENTENCE_BY_ID[id].text}
                  </span>
                  <span
                    style={{
                      flexShrink: 0,
                      fontSize: 10,
                      color: palette.faint,
                      fontFamily: mono,
                    }}
                  >
                    {sentenceDuration(id).toFixed(1)}s
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSentence(id);
                    }}
                    aria-label="Remove clip"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: 16,
                      height: 16,
                      padding: 0,
                      background: "transparent",
                      border: "none",
                      color: palette.tertiary,
                      cursor: "pointer",
                      transition: "color 120ms",
                    }}
                    onMouseEnter={(e) =>
                      ((e.currentTarget as HTMLButtonElement).style.color =
                        palette.destructive)
                    }
                    onMouseLeave={(e) =>
                      ((e.currentTarget as HTMLButtonElement).style.color = palette.tertiary)
                    }
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 10, fontSize: 11, color: palette.tertiary }}>
              Drag clips to reorder — the video follows the transcript order. Graphics are
              keyword-triggered and placed in negative space (QR drops to bottom-right or hides
              when the creator&rsquo;s face is in the zone — face detection is a follow-up).
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

// ---- Keyword-triggered graphic overlays (spec §2–§4) ----

function cuePosition(position: OverlayPosition): CSSProperties {
  switch (position) {
    case "top-right":
      return { top: 12, right: 12 };
    case "bottom-right":
      return { bottom: 48, right: 12 };
    case "bottom-center":
      return { left: 0, right: 0, bottom: 50, display: "flex", justifyContent: "center" };
    case "left":
      return { left: 12, top: "50%", transform: "translateY(-50%)" };
    case "center-left":
      return { left: 12, top: "42%", transform: "translateY(-50%)" };
    default:
      return { display: "none" };
  }
}

function CueOverlay({ cue }: { cue: OverlayCue }) {
  const base: CSSProperties = { position: "absolute", ...cuePosition(cue.position) };

  if (cue.asset === "qr") {
    return (
      <div
        style={{ ...base, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3,1fr)",
            gridTemplateRows: "repeat(3,1fr)",
            gap: 2,
            height: 56,
            width: 56,
            padding: 4,
            background: "#fff",
            borderRadius: 4,
            boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
          }}
        >
          {[1, 1, 0, 1, 0, 1, 0, 1, 1].map((b, i) => (
            <div key={i} style={{ background: b ? "#000" : "#fff" }} />
          ))}
        </div>
      </div>
    );
  }

  if (cue.asset === "cta_text") {
    return (
      <div style={base}>
        <span
          style={{
            fontSize: 16,
            fontWeight: 800,
            color: "#fff",
            letterSpacing: "0.02em",
            textShadow:
              "-1.5px -1.5px 0 #000, 1.5px -1.5px 0 #000, -1.5px 1.5px 0 #000, 1.5px 1.5px 0 #000",
          }}
        >
          LINK IN DESC
        </span>
      </div>
    );
  }

  // Supporting graphics (PayPal receipt / app browse / cashout UI) — left-anchored
  // placeholder cards balancing the QR on the right.
  return (
    <div
      style={{
        ...base,
        width: 96,
        padding: "8px 10px",
        background: "rgba(255,255,255,0.96)",
        color: "#0a0a0a",
        borderRadius: 6,
        boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
        fontSize: 10,
        fontWeight: 700,
        lineHeight: 1.3,
      }}
    >
      {cue.label}
    </div>
  );
}

// Render sentence text, striking through filler words when trimming is on.
function renderWords(text: string, trim: boolean) {
  if (!trim) return text;
  return text.split(/(\s+)/).map((token, i) => {
    if (/^\s+$/.test(token)) return token;
    const isFiller = FILLER_WORDS.has(cleanWord(token));
    return isFiller ? (
      <span
        key={i}
        style={{
          color: "rgba(251,191,36,0.7)",
          textDecoration: "line-through",
          textDecorationColor: "rgba(251,191,36,0.6)",
        }}
      >
        {token}
      </span>
    ) : (
      <span key={i}>{token}</span>
    );
  });
}

function AspectToggle({
  aspect,
  onChange,
}: {
  aspect: AspectRatio;
  onChange: (a: AspectRatio) => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        padding: 3,
        gap: 2,
        background: palette.pageBg,
        border: `1px solid ${palette.subBorder}`,
        borderRadius: 6,
      }}
    >
      {ASPECT_RATIOS.map((a) => {
        const active = a === aspect;
        return (
          <button
            key={a}
            onClick={() => onChange(a)}
            style={{
              padding: "5px 10px",
              borderRadius: 4,
              fontSize: 11,
              fontWeight: 600,
              fontFamily: mono,
              cursor: "pointer",
              background: active ? "rgba(74,222,128,0.12)" : "transparent",
              color: active ? palette.accent : palette.secondary,
              border: `1px solid ${active ? "rgba(74,222,128,0.35)" : "transparent"}`,
              transition: "color 120ms, background 120ms",
            }}
          >
            {a}
          </button>
        );
      })}
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        color: palette.secondary,
        cursor: "pointer",
        userSelect: "none",
      }}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        style={{ width: 12, height: 12, accentColor: palette.accent }}
      />
      {label}
    </label>
  );
}

function Dot({ color }: { color: string }) {
  return (
    <span
      style={{
        display: "inline-block",
        width: 6,
        height: 6,
        borderRadius: "50%",
        background: color,
      }}
    />
  );
}
