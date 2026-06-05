// Shown instantly on navigation while the next (dynamic) page renders on the
// server — so clicks feel immediate instead of dead. Pure CSS shimmer, no JS.
const block = (w: number | string, h: number, mt = 0): React.CSSProperties => ({
  width: w,
  height: h,
  marginTop: mt,
  borderRadius: 4,
  background:
    "linear-gradient(90deg, #111 25%, #1a1a1a 37%, #111 63%)",
  backgroundSize: "400% 100%",
  animation: "panelShimmer 1.4s ease infinite",
});

export default function Loading() {
  return (
    <div>
      <style>{`@keyframes panelShimmer{0%{background-position:100% 0}100%{background-position:-100% 0}}`}</style>
      {/* hero title */}
      <div style={block(220, 26)} />
      <div style={block(320, 14, 8)} />
      {/* stat band */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 1,
          marginTop: 24,
          border: "1px solid #181818",
          borderRadius: 4,
          overflow: "hidden",
          background: "#181818",
        }}
      >
        {[0, 1, 2, 3].map((i) => (
          <div key={i} style={{ background: "#111", padding: "22px 24px" }}>
            <div style={block(70, 10)} />
            <div style={block(90, 34, 12)} />
          </div>
        ))}
      </div>
      {/* card */}
      <div
        style={{
          marginTop: 24,
          border: "1px solid #181818",
          borderRadius: 4,
          background: "#111",
          padding: 24,
        }}
      >
        <div style={block(80, 10)} />
        <div style={block("100%", 14, 16)} />
        <div style={block("60%", 14, 8)} />
      </div>
    </div>
  );
}
