"use client";

import { useEffect } from "react";

// App-group error boundary. A failed DB query or render shows a recoverable
// card with a Retry button instead of a blank screen.
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div
      style={{
        border: "1px solid #2a1a1a",
        borderRadius: 4,
        background: "#0d0d0d",
        padding: 24,
        maxWidth: 560,
      }}
    >
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          color: "#f87171",
        }}
      >
        Something went wrong
      </div>
      <p style={{ marginTop: 10, fontSize: 13, color: "#b0b0b0", lineHeight: 1.6 }}>
        This page couldn&rsquo;t load — usually a transient database connection issue.
        {error?.message ? ` (${error.message})` : ""}
      </p>
      <button
        onClick={() => reset()}
        style={{
          marginTop: 16,
          padding: "8px 16px",
          borderRadius: 4,
          background: "transparent",
          border: "1px solid #2a2a2a",
          color: "#aaa",
          fontSize: 12,
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        Retry
      </button>
    </div>
  );
}
