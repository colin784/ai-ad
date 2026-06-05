"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { palette } from "./panel-ui";

const LINKS = [
  { href: "/", label: "Dashboard" },
  { href: "/creators", label: "Creators" },
  { href: "/projects", label: "Projects" },
  { href: "/assets", label: "Assets" },
  { href: "/review", label: "Review editor" },
];

export function Nav() {
  const pathname = usePathname();
  return (
    <aside
      style={{
        width: 224,
        flexShrink: 0,
        borderRight: `1px solid ${palette.border}`,
        background: palette.panelBg,
        padding: 20,
      }}
    >
      <div style={{ marginBottom: 28, paddingLeft: 6 }}>
        <div
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: palette.titleText,
            letterSpacing: "-0.01em",
          }}
        >
          AI Ad Editor
        </div>
        <div
          style={{
            fontSize: 10,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.12em",
            color: palette.faint,
            marginTop: 4,
          }}
        >
          internal · phase 1
        </div>
      </div>
      <nav style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {LINKS.map((l) => {
          const active =
            l.href === "/" ? pathname === "/" : pathname?.startsWith(l.href);
          return (
            <Link
              key={l.href}
              href={l.href}
              style={{
                padding: "8px 10px",
                borderRadius: 4,
                fontSize: 13,
                fontWeight: active ? 600 : 500,
                color: active ? palette.strongText : palette.secondary,
                background: active ? "rgba(74,222,128,0.08)" : "transparent",
                border: `1px solid ${active ? "rgba(74,222,128,0.25)" : "transparent"}`,
                textDecoration: "none",
                transition: "color 120ms, background 120ms, border-color 120ms",
              }}
            >
              {l.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
