import Link from "next/link";

const LINKS = [
  { href: "/", label: "Dashboard" },
  { href: "/creators", label: "Creators" },
  { href: "/projects", label: "Projects" },
  { href: "/assets", label: "Assets" },
  { href: "/review", label: "Review editor" },
];

/**
 * App shell navigation. Auth is out of scope for the scaffold (internal tool),
 * but this is where an auth-gated user menu would live — the layout is already
 * structured for it.
 */
export function Nav() {
  return (
    <aside className="w-56 shrink-0 border-r border-neutral-800 bg-neutral-900/40 p-4">
      <div className="mb-6 px-2">
        <div className="text-sm font-semibold tracking-tight">AI Ad Editor</div>
        <div className="text-xs text-neutral-500">internal · phase 1</div>
      </div>
      <nav className="flex flex-col gap-1">
        {LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="rounded-md px-2 py-1.5 text-sm text-neutral-300 hover:bg-neutral-800 hover:text-white"
          >
            {l.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
