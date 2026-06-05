import { statusLabel } from "@/domain/jobState";
import type { AssetStatus } from "@/db/schema";

const STATUS_STYLES: Record<string, string> = {
  uploaded: "bg-neutral-700 text-neutral-200",
  transcribing: "bg-blue-900 text-blue-200",
  ready_for_analysis: "bg-blue-900 text-blue-200",
  analyzed: "bg-indigo-900 text-indigo-200",
  rendering: "bg-amber-900 text-amber-200",
  review: "bg-purple-900 text-purple-200",
  exported: "bg-emerald-900 text-emerald-200",
  failed: "bg-red-900 text-red-200",
};

export function StatusBadge({ status }: { status: AssetStatus }) {
  const cls = STATUS_STYLES[status] ?? "bg-neutral-700 text-neutral-200";
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>
      {statusLabel(status)}
    </span>
  );
}

export function PageHeader({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex items-end justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-neutral-400">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

export function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-lg border border-neutral-800 bg-neutral-900/40 p-4 ${className}`}>
      {children}
    </div>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-dashed border-neutral-800 p-8 text-center text-sm text-neutral-500">
      {message}
    </div>
  );
}
