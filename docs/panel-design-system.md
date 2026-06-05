# Panel Design System (binding)

This is the binding visual spec for the AI Ad Editor. Every screen and component matches it. The canonical implementation lives in `src/components/panel-ui.tsx` — that file is the source of truth for tokens, primitives, and patterns; this doc explains the system.

No emojis. No decorative icons. Mid-gray + green accent. Inter for body, JetBrains Mono for numbers.

---

## Foundation

| Token | Hex | Use |
| --- | --- | --- |
| `pageBg` | `#0a0a0a` | Page background |
| `panelBg` | `#111` | Panel surface |
| `subCardBg` | `#0d0d0d` | Sub-card surface |
| `border` | `#181818` | Panel border |
| `subBorder` / `subBorder2` | `#1a1a1a` / `#222` | Sub-card / divider |
| `controlBorder` | `#2a2a2a` | Input/control |
| `titleText` | `#f0f0f0` | Titles |
| `strongText` | `#e0e0e0` | Strong body |
| `body` | `#aaa` | Body |
| `secondary` | `#888` | Secondary |
| `tertiary` | `#666` | Tertiary |
| `faint` | `#555` | Faint label |
| `placeholder` | `#444` / `#333` | Placeholder |
| `accent` | `#4ade80` | Positive / brand — use sparingly |
| `destructive` | `#f87171` | Negative deltas, delete |
| `tagBlue` | `#60a5fa` | Categorical |
| `tagPurple` | `#a78bfa` | Categorical |
| `tagAmber` | `#fbbf24` | Categorical |
| `tagGray` | `#9ca3af` | Neutral/external |

Tinted chip fill formula: `background: ${color}22; border: 1px solid ${color}44; color: ${color}`.

## Typography

- **Font stack:** Inter (default). **Numbers use JetBrains Mono.** Body copy stays Inter.
- **Hierarchy:**
  - Page hero: 28–42 / weight 700 / `letterSpacing: -0.02em` / JetBrains Mono for `$` values
  - Card title: 15–16 / 600–700
  - Body: 12–13 / 400–600
  - Section label: 10–11 / 700 / `textTransform: uppercase` / `letterSpacing: 0.08–0.12em` / color `#555–#888`
  - Caption: 11 / 400 / `#666`

## Spacing

- Panel padding: **22–26** · Card padding: **20–24** · Sub-card padding: **10–14**
- Gaps: 6–8 (chip group), 12 (related), 16–22 (between blocks), 32–56 (column splits)
- Divider: `<div style={{ height: 1, background: "#1a1a1a", margin: "18–22px 0" }} />`

## Components

- **Card / SubCard** — `<Card>` (`#111` + `#181818` border) and `<SubCard>` (`#0d0d0d` + `#1a1a1a` border), `borderRadius: 4`.
- **Buttons** — `<PrimaryButton>` (filled `#f0f0f0` on `#0a0a0a`, opacity 0.85 on hover), `<SecondaryButton>` (transparent + `#2a2a2a` border, color/border lift on hover), `<DestructiveButton>` (red hover).
- **Chip** — `<Chip color={palette.tagBlue}>`. Default `tagGray`. `<StatusChip>` for asset states.
- **Tab pill bar** — contained pill style with `rgba(74,222,128,0.12)` active fill, `rgba(74,222,128,0.35)` active border, accent text.
- **Progress bar** — `<ProgressBar pct={…} />` 4px high, `#181818` track, accent fill at 0.7 opacity.
- **Modal** — overlay `rgba(0,0,0,0.65)`, panel `#0f0f0f` + `#2a2a2a` border, `borderRadius: 8`, X (lucide) in top-right.
- **Inline callout** — `<Callout>` (`#0d0d0d` bg, `#1f1f1f` border).
- **Inputs** — `inputStyle` constant; focus border `#444`.
- **Empty state** — `<EmptyState>` centered, color `#555`, 40–60px vertical padding.

## Iconography

- **Library:** `lucide-react` only. `Check`, `X`, `Eye`, `EyeOff`, `Loader2` (with `className="animate-spin"`), `TrendingUp`, `TrendingDown`, `ChevronDown`, `ExternalLink`, `Download`, etc.
- 11–14px next to body text; 16–18px for buttons/headers.
- No decorative icons next to copy.

## Interaction

- **Toasts:** `sonner` — `toast.success(...)` / `toast.error("Couldn't X", { description: err.message })`. Every mutation needs `onError`.
- **Hover:** 120–150ms on `color`, `background`, `border-color`. No transforms.
- **Loading:** `<Loader2 className="animate-spin" />` next to text. Buttons dim background while loading.
- **Empty:** centered, `#555`, 40–60px vertical padding.
- **Error:** red banner inside `border: "1px solid #2a1a1a"`, retry button (secondary style).

## Layout

- Hero number pairs side-by-side: `gridTemplateColumns: "auto auto", columnGap: 56` — not `flex: 1`.
- Progress bars stretch the full panel width below the headline pair.
- Hide-dollar toggle (when relevant): top-right of personal stat panels, pill-style with `Eye`/`EyeOff`. Persist via `localStorage`.

## Anti-patterns

- Emojis in UI copy.
- Colored borders / glows / gradients for flair.
- Bright per-tool tint colors (everything is mid-gray + green accent + the four categorical chip colors).
- `flex: 1` on one stat in a side-by-side pair.
- Spinners without an `isError` branch underneath.
- Bold sentences in body copy — use `<strong style={{ color: "#e0e0e0", fontWeight: 600 }}>` sparingly inside a longer paragraph.

---

When adding a feature, mirror the structure of existing cards. Default to mid-gray + green; reach for blue/purple/amber/red only when categorical or status-laden.
