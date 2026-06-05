import type { Metadata } from "next";
import { ReviewEditor } from "@/components/review/review-editor";

export const metadata: Metadata = {
  title: "Review editor — AI Ad Editor",
};

// Full-bleed prototype of the transcript review editor (mock data).
export default function ReviewPage() {
  return <ReviewEditor />;
}
