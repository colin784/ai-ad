"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ASPECT_RATIOS,
  FILLER_WORDS,
  PROJECT,
  SENTENCE_BY_ID,
  TRANSCRIPT,
  VARIANTS,
  formatTime,
  sentenceDuration,
  type AspectRatio,
} from "./mock-data";

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
      // Re-insert keeping original chronological position among included clips.
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

  return (
    <div className="flex h-[calc(100vh-1px)] flex-col">
      {/* Top bar */}
      <header className="flex items-center justify-between border-b border-neutral-800 px-6 py-3">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="rounded-md px-2 py-1 text-sm text-neutral-400 hover:bg-neutral-800 hover:text-white"
          >
            ← Back
          </Link>
          <div>
            <div className="text-sm font-semibold">{PROJECT.project}</div>
            <div className="text-xs text-neutral-500">
              {PROJECT.creator} · {PROJECT.asset}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <AspectToggle aspect={aspect} onChange={setAspect} />
          <button
            onClick={reRender}
            disabled={rendering}
            className="rounded-md bg-neutral-100 px-3 py-1.5 text-sm font-medium text-neutral-900 hover:bg-white disabled:opacity-60"
          >
            {rendering ? "Rendering…" : "Re-render"}
          </button>
        </div>
      </header>

      {/* Variant tabs */}
      <div className="flex items-center gap-2 border-b border-neutral-800 px-6 py-2">
        {VARIANTS.map((v) => {
          const st = variantState[v.id];
          const dur = st.order.reduce((s, id) => s + sentenceDuration(id), 0);
          const active = v.id === activeId;
          return (
            <button
              key={v.id}
              onClick={() => setActiveId(v.id)}
              className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-sm ${
                active
                  ? "bg-neutral-800 text-white"
                  : "text-neutral-400 hover:bg-neutral-900 hover:text-neutral-200"
              }`}
            >
              <span className="font-medium">{v.label}</span>
              <span className="text-xs text-neutral-500">{v.angle}</span>
              <span className="text-xs text-neutral-500">· {dur.toFixed(0)}s</span>
              {st.status === "approved" && <Dot className="bg-emerald-400" />}
              {st.status === "rejected" && <Dot className="bg-red-400" />}
            </button>
          );
        })}
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setStatus(state.status === "rejected" ? null : "rejected")}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${
              state.status === "rejected"
                ? "bg-red-900 text-red-200"
                : "text-neutral-400 hover:bg-neutral-800 hover:text-white"
            }`}
          >
            Reject
          </button>
          <button
            onClick={() => setStatus(state.status === "approved" ? null : "approved")}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${
              state.status === "approved"
                ? "bg-emerald-600 text-white"
                : "bg-emerald-700/40 text-emerald-200 hover:bg-emerald-600/60"
            }`}
          >
            {state.status === "approved" ? "Approved ✓" : "Approve"}
          </button>
        </div>
      </div>

      {/* Main */}
      <div className="grid flex-1 grid-cols-[1.15fr_1fr] overflow-hidden">
        {/* Transcript editor */}
        <section className="flex flex-col overflow-hidden border-r border-neutral-800">
          <div className="flex items-center justify-between px-6 py-3">
            <div>
              <div className="text-sm font-medium">Transcript</div>
              <div className="text-xs text-neutral-500">
                Click a line to keep or cut it — removing a line removes that moment from the video.
              </div>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <Check label="Trim fillers" checked={trimFillers} onChange={setTrimFillers} />
              <Check label="Hide removed" checked={hideRemoved} onChange={setHideRemoved} />
            </div>
          </div>
          <div className="flex-1 space-y-1 overflow-y-auto px-4 pb-6">
            {TRANSCRIPT.map((s) => {
              const included = includedSet.has(s.id);
              if (!included && hideRemoved) return null;
              const isHook = s.id === variant.hookId;
              const isPlaying = included && order[playIndex] === s.id && playing;
              return (
                <button
                  key={s.id}
                  onClick={() => toggleSentence(s.id)}
                  className={`group flex w-full gap-3 rounded-md border-l-2 px-3 py-2 text-left transition ${
                    included
                      ? "border-emerald-500 bg-neutral-900/60 hover:bg-neutral-800/70"
                      : "border-transparent opacity-45 hover:opacity-80"
                  } ${isPlaying ? "ring-1 ring-emerald-400/60" : ""}`}
                >
                  <span className="mt-0.5 w-12 shrink-0 font-mono text-[11px] text-neutral-500">
                    {formatTime(s.start)}
                  </span>
                  <span
                    className={`text-sm leading-relaxed ${
                      included ? "text-neutral-100" : "text-neutral-500 line-through"
                    }`}
                  >
                    {isHook && (
                      <span className="mr-2 rounded bg-amber-500/20 px-1.5 py-0.5 align-middle text-[10px] font-semibold uppercase tracking-wide text-amber-300">
                        Hook
                      </span>
                    )}
                    {renderWords(s.text, trimFillers && included)}
                  </span>
                  <span className="ml-auto self-center text-[11px] text-neutral-600 opacity-0 group-hover:opacity-100">
                    {included ? "remove" : "keep"}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Preview + timeline */}
        <section className="flex flex-col overflow-hidden">
          <div className="flex flex-1 flex-col items-center justify-center overflow-hidden p-6">
            {/* Preview frame */}
            <div
              className="relative max-h-[46vh] overflow-hidden rounded-xl bg-black shadow-2xl ring-1 ring-neutral-800"
              style={{ aspectRatio: aspectCss, height: "46vh" }}
            >
              {/* gradient backdrop */}
              <div className="absolute inset-0 bg-gradient-to-br from-rose-500/20 via-neutral-900 to-indigo-500/20" />
              {/* hook overlay */}
              <div className="absolute inset-x-0 top-0 p-4">
                <p className="text-balance text-center text-lg font-extrabold leading-tight text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                  {SENTENCE_BY_ID[variant.hookId].text}
                </p>
              </div>
              {/* burned-in caption */}
              <div className="absolute inset-x-0 bottom-10 px-4">
                <p className="mx-auto max-w-[90%] text-balance text-center text-sm font-bold text-white drop-shadow-[0_2px_3px_rgba(0,0,0,0.9)]">
                  {captionText}
                </p>
              </div>
              {/* play button */}
              <button
                onClick={() => setPlaying((p) => !p)}
                className="absolute inset-0 flex items-center justify-center"
                aria-label={playing ? "Pause" : "Play"}
              >
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-black/40 text-2xl text-white backdrop-blur transition hover:bg-black/60">
                  {playing ? "❚❚" : "▶"}
                </span>
              </button>
              {/* scrubber */}
              <div className="absolute inset-x-0 bottom-0 p-3">
                <div className="h-1 w-full overflow-hidden rounded-full bg-white/20">
                  <div
                    className="h-full bg-white transition-all"
                    style={{ width: `${duration ? Math.min(100, (elapsed / duration) * 100) : 0}%` }}
                  />
                </div>
                <div className="mt-1 flex justify-between text-[10px] text-white/80">
                  <span>{formatTime(elapsed)}</span>
                  <span>{aspect}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>
            </div>

            {renderedAt && !rendering && (
              <div className="mt-3 rounded-md bg-emerald-900/40 px-3 py-1 text-xs text-emerald-200">
                Rendered {ASPECT_RATIOS.length} formats at {renderedAt}
              </div>
            )}
          </div>

          {/* Timeline */}
          <div className="border-t border-neutral-800 px-6 py-4">
            <div className="mb-2 flex items-center justify-between">
              <div className="text-sm font-medium">Cut timeline</div>
              <div className="text-xs">
                <span className={overTarget ? "text-red-400" : "text-neutral-300"}>
                  {duration.toFixed(1)}s
                </span>
                <span className="text-neutral-600"> / {variant.targetSeconds}s target</span>
              </div>
            </div>
            <div className="mb-3 h-1.5 w-full overflow-hidden rounded-full bg-neutral-800">
              <div
                className={`h-full ${overTarget ? "bg-red-500" : "bg-emerald-500"}`}
                style={{ width: `${Math.min(100, (duration / variant.targetSeconds) * 100)}%` }}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {order.map((id, i) => (
                <div
                  key={id}
                  draggable
                  onDragStart={() => setDragId(id)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => onDrop(id)}
                  className={`group flex max-w-[160px] cursor-grab items-center gap-2 rounded-md border border-neutral-700 bg-neutral-900 px-2.5 py-1.5 active:cursor-grabbing ${
                    dragId === id ? "opacity-40" : ""
                  }`}
                  title="Drag to reorder"
                >
                  <span className="text-[11px] font-semibold text-neutral-500">{i + 1}</span>
                  <span className="truncate text-xs text-neutral-200">
                    {SENTENCE_BY_ID[id].text}
                  </span>
                  <span className="shrink-0 text-[10px] text-neutral-500">
                    {sentenceDuration(id).toFixed(1)}s
                  </span>
                  <button
                    onClick={() => toggleSentence(id)}
                    className="shrink-0 text-neutral-600 opacity-0 transition hover:text-red-400 group-hover:opacity-100"
                    aria-label="Remove clip"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
            <p className="mt-2 text-xs text-neutral-600">
              Drag clips to reorder — the video follows the transcript order.
            </p>
          </div>
        </section>
      </div>
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
      <span key={i} className="text-amber-500/70 line-through decoration-amber-500/70">
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
    <div className="flex overflow-hidden rounded-md border border-neutral-700">
      {ASPECT_RATIOS.map((a) => (
        <button
          key={a}
          onClick={() => onChange(a)}
          className={`px-2.5 py-1.5 text-xs ${
            a === aspect ? "bg-neutral-700 text-white" : "text-neutral-400 hover:bg-neutral-800"
          }`}
        >
          {a}
        </button>
      ))}
    </div>
  );
}

function Check({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-1.5 text-neutral-400">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-3.5 w-3.5 accent-emerald-500"
      />
      {label}
    </label>
  );
}

function Dot({ className }: { className: string }) {
  return <span className={`h-2 w-2 rounded-full ${className}`} />;
}
