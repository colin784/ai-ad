"use client";

import type { CSSProperties, ButtonHTMLAttributes, ReactNode } from "react";

/**
 * Panel design system. Tokens + reusable primitives that match the binding
 * style guide (see CLAUDE.md / paste-in spec): mid-gray + green accent,
 * Inter body + JetBrains Mono for numbers, no decorative icons, hover via
 * color/background/border-color transitions only.
 *
 * Everything is inline-styled per spec so this file IS the canonical
 * reference — no Tailwind theme translation in between.
 */

export const palette = {
  pageBg: "#0a0a0a",
  panelBg: "#111",
  subCardBg: "#0d0d0d",
  border: "#181818",
  subBorder: "#1a1a1a",
  subBorder2: "#222",
  controlBorder: "#2a2a2a",
  titleText: "#f0f0f0",
  strongText: "#e0e0e0",
  body: "#aaa",
  secondary: "#888",
  tertiary: "#666",
  faint: "#555",
  placeholder: "#444",
  divider: "#1a1a1a",
  accent: "#4ade80",
  destructive: "#f87171",
  tagBlue: "#60a5fa",
  tagPurple: "#a78bfa",
  tagAmber: "#fbbf24",
  tagGray: "#9ca3af",
} as const;

// Matches the next/font CSS variable set in src/app/layout.tsx so the
// network-loaded JetBrains Mono is actually used.
export const mono = "var(--font-jetbrains), 'JetBrains Mono', monospace";

// ---------- Card / SubCard ----------

export function Card({
  children,
  style,
  pad = 24,
}: {
  children: ReactNode;
  style?: CSSProperties;
  pad?: number;
}) {
  return (
    <div
      style={{
        background: palette.panelBg,
        border: `1px solid ${palette.border}`,
        borderRadius: 4,
        padding: pad,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function SubCard({
  children,
  style,
  pad = 12,
}: {
  children: ReactNode;
  style?: CSSProperties;
  pad?: number;
}) {
  return (
    <div
      style={{
        background: palette.subCardBg,
        border: `1px solid ${palette.subBorder}`,
        borderRadius: 4,
        padding: pad,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// ---------- Buttons ----------

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & { full?: boolean };

export function PrimaryButton({ style, full, disabled, ...rest }: BtnProps) {
  return (
    <button
      {...rest}
      disabled={disabled}
      style={{
        padding: "8px 16px",
        borderRadius: 4,
        background: disabled ? palette.subBorder : palette.titleText,
        color: disabled ? palette.placeholder : palette.pageBg,
        border: "none",
        fontSize: 12,
        fontWeight: 700,
        cursor: disabled ? "not-allowed" : "pointer",
        transition: "opacity 150ms",
        width: full ? "100%" : undefined,
        ...style,
      }}
      onMouseEnter={(e) => {
        if (!disabled) (e.currentTarget as HTMLButtonElement).style.opacity = "0.85";
        rest.onMouseEnter?.(e);
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.opacity = "1";
        rest.onMouseLeave?.(e);
      }}
    />
  );
}

export function SecondaryButton({ style, ...rest }: BtnProps) {
  return (
    <button
      {...rest}
      style={{
        padding: "8px 16px",
        borderRadius: 4,
        background: "transparent",
        border: `1px solid ${palette.controlBorder}`,
        color: palette.body,
        fontSize: 12,
        fontWeight: 600,
        cursor: "pointer",
        transition: "color 120ms, border-color 120ms",
        ...style,
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLButtonElement;
        el.style.color = palette.strongText;
        el.style.borderColor = palette.placeholder;
        rest.onMouseEnter?.(e);
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLButtonElement;
        el.style.color = palette.body;
        el.style.borderColor = palette.controlBorder;
        rest.onMouseLeave?.(e);
      }}
    />
  );
}

export function DestructiveButton({ style, ...rest }: BtnProps) {
  return (
    <button
      {...rest}
      style={{
        padding: "8px 16px",
        borderRadius: 4,
        background: "transparent",
        border: `1px solid #2a1a1a`,
        color: palette.tertiary,
        fontSize: 12,
        fontWeight: 600,
        cursor: "pointer",
        transition: "color 120ms, border-color 120ms",
        ...style,
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLButtonElement;
        el.style.color = palette.destructive;
        el.style.borderColor = "rgba(248,113,113,0.4)";
        rest.onMouseEnter?.(e);
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLButtonElement;
        el.style.color = palette.tertiary;
        el.style.borderColor = "#2a1a1a";
        rest.onMouseLeave?.(e);
      }}
    />
  );
}

// ---------- Chip ----------

export function Chip({
  color = palette.tagGray,
  children,
  style,
}: {
  color?: string;
  children: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "2px 7px",
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 600,
        whiteSpace: "nowrap",
        background: `${color}22`,
        color,
        border: `1px solid ${color}44`,
        ...style,
      }}
    >
      {children}
    </span>
  );
}

// ---------- Section label ----------

export function SectionLabel({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div
      style={{
        fontSize: 10,
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.1em",
        color: palette.faint,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// ---------- Divider ----------

export function Divider({ marginY = 20 }: { marginY?: number }) {
  return (
    <div
      style={{ height: 1, background: palette.divider, margin: `${marginY}px 0` }}
    />
  );
}

// ---------- Stat (mono numbers) ----------

export function Stat({
  label,
  value,
  sub,
}: {
  label: string;
  value: string | number;
  sub?: ReactNode;
}) {
  return (
    <div>
      <SectionLabel>{label}</SectionLabel>
      <div
        style={{
          marginTop: 6,
          fontSize: 42,
          fontWeight: 700,
          letterSpacing: "-0.02em",
          fontFamily: mono,
          color: palette.titleText,
          lineHeight: 1,
        }}
      >
        {value}
      </div>
      {sub && (
        <div style={{ marginTop: 6, fontSize: 12, color: palette.secondary }}>{sub}</div>
      )}
    </div>
  );
}

// ---------- Progress bar ----------

export function ProgressBar({ pct, color = palette.accent }: { pct: number; color?: string }) {
  return (
    <div
      style={{
        position: "relative",
        height: 4,
        background: palette.border,
        borderRadius: 2,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          width: `${Math.min(100, Math.max(0, pct))}%`,
          background: color,
          opacity: 0.7,
          transition: "width 400ms",
        }}
      />
    </div>
  );
}

// ---------- Inline callout ----------

export function Callout({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div
      style={{
        padding: "12px 14px",
        background: palette.subCardBg,
        border: "1px solid #1f1f1f",
        borderRadius: 4,
        fontSize: 12,
        color: "#b0b0b0",
        lineHeight: 1.6,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// ---------- Inputs ----------

export const inputStyle: CSSProperties = {
  background: palette.pageBg,
  border: `1px solid ${palette.subBorder2}`,
  borderRadius: 4,
  color: palette.strongText,
  fontSize: 13,
  padding: "8px 12px",
  outline: "none",
};

// ---------- Empty state ----------

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        textAlign: "center",
        padding: "60px 20px",
        fontSize: 13,
        color: palette.faint,
      }}
    >
      {children}
    </div>
  );
}

// ---------- Status chip (asset pipeline state) ----------

const STATUS_COLORS: Record<string, string> = {
  uploaded: palette.tagGray,
  transcribing: palette.tagBlue,
  ready_for_analysis: palette.tagBlue,
  analyzed: palette.tagPurple,
  rendering: palette.tagAmber,
  review: palette.tagPurple,
  exported: palette.accent,
  failed: palette.destructive,
};

export function StatusChip({ status, label }: { status: string; label: string }) {
  return <Chip color={STATUS_COLORS[status] ?? palette.tagGray}>{label}</Chip>;
}

// ---------- Page hero ----------

export function PageHero({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "space-between",
        gap: 24,
        marginBottom: 24,
      }}
    >
      <div>
        <h1
          style={{
            fontSize: 28,
            fontWeight: 700,
            letterSpacing: "-0.02em",
            color: palette.titleText,
            margin: 0,
          }}
        >
          {title}
        </h1>
        {subtitle && (
          <div style={{ marginTop: 6, fontSize: 13, color: palette.secondary }}>
            {subtitle}
          </div>
        )}
      </div>
      {right}
    </div>
  );
}
