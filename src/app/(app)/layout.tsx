import { Nav } from "@/components/nav";

// App shell: top nav bar (matches the Panel admin) + centered content.
// /review renders full-bleed and lives outside this group.
export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", display: "flex", flexDirection: "column" }}>
      <Nav />
      <main style={{ flex: 1, padding: "28px 40px" }}>
        <div style={{ maxWidth: 1320, margin: "0 auto" }}>{children}</div>
      </main>
    </div>
  );
}
