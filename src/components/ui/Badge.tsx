import type { ReactNode } from "react";
import { clsx } from "clsx";

export type BadgeTone = "slate" | "blue" | "amber" | "emerald" | "red" | "violet";

const TONE_STYLES: Record<BadgeTone, string> = {
  slate: "bg-slate-50 text-slate-600 ring-1 ring-inset ring-slate-200",
  blue: "bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-200",
  amber: "bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-200",
  emerald: "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200",
  red: "bg-red-50 text-red-700 ring-1 ring-inset ring-red-200",
  violet: "bg-violet-50 text-violet-700 ring-1 ring-inset ring-violet-200",
};

const DOT_STYLES: Record<BadgeTone, string> = {
  slate: "bg-slate-400",
  blue: "bg-blue-500",
  amber: "bg-amber-500",
  emerald: "bg-emerald-500",
  red: "bg-red-500",
  violet: "bg-violet-500",
};

export function Badge({ tone = "slate", children, className }: { tone?: BadgeTone; children: ReactNode; className?: string }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-medium",
        TONE_STYLES[tone],
        className
      )}
    >
      <span className={clsx("h-1.5 w-1.5 shrink-0 rounded-full", DOT_STYLES[tone])} aria-hidden="true" />
      {children}
    </span>
  );
}
