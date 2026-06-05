import { Nav } from "@/components/nav";

// Layout for the main app shell (dashboard, creators, projects, assets).
// The /review editor lives outside this group so it can render full-bleed.
export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <Nav />
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
