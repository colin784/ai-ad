import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Ad Editor",
  description: "Transcript-driven AI ad editor for managed creators (internal).",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
