"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Settings, LogOut } from "lucide-react";
import { toast } from "sonner";
import { palette } from "./panel-ui";

const LINKS = [
  { href: "/", label: "Produce" },
  { href: "/brands", label: "Brands" },
];

export function Nav() {
  const pathname = usePathname();
  return (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        height: 56,
        padding: "0 40px",
        borderBottom: `1px solid ${palette.border}`,
        background: palette.pageBg,
        position: "sticky",
        top: 0,
        zIndex: 50,
      }}
    >
      {/* Brand */}
      <Link
        href="/"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 10,
          textDecoration: "none",
          marginRight: 28,
        }}
      >
        <span
          style={{
            width: 20,
            height: 20,
            borderRadius: 4,
            background: palette.titleText,
            display: "inline-block",
          }}
        />
        <span style={{ fontSize: 15, fontWeight: 700, color: palette.titleText }}>
          Panel
        </span>
      </Link>

      {/* Tabs */}
      <nav style={{ display: "flex", alignItems: "center", gap: 4 }}>
        {LINKS.map((l) => {
          const active =
            l.href === "/" ? pathname === "/" : pathname?.startsWith(l.href);
          return (
            <Link
              key={l.href}
              href={l.href}
              style={{
                padding: "6px 12px",
                borderRadius: 6,
                fontSize: 13,
                fontWeight: 600,
                color: active ? palette.titleText : palette.secondary,
                background: active ? "rgba(255,255,255,0.06)" : "transparent",
                textDecoration: "none",
                transition: "color 120ms, background 120ms",
              }}
            >
              {l.label}
            </Link>
          );
        })}
      </nav>

      {/* Right actions */}
      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 16 }}>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontSize: 13,
            fontWeight: 600,
            color: palette.secondary,
          }}
        >
          <Settings size={14} />
          Admin
        </span>
        <button
          onClick={() => toast.info("No auth wired in this build")}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "6px 12px",
            borderRadius: 4,
            background: "transparent",
            border: `1px solid ${palette.controlBorder}`,
            color: palette.body,
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
            transition: "color 120ms, border-color 120ms",
          }}
          onMouseEnter={(e) => {
            const el = e.currentTarget;
            el.style.color = palette.strongText;
            el.style.borderColor = palette.placeholder;
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget;
            el.style.color = palette.body;
            el.style.borderColor = palette.controlBorder;
          }}
        >
          <LogOut size={14} />
          Log out
        </button>
      </div>
    </header>
  );
}
