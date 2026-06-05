import { Nav } from "@/components/nav";

// App shell layout: dashboard, creators, projects, assets. /review renders
// full-bleed and lives outside this group.
export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#0a0a0a" }}>
      <Nav />
      <main style={{ flex: 1, padding: "32px 40px", maxWidth: 1280 }}>
        {children}
      </main>
    </div>
  );
}
