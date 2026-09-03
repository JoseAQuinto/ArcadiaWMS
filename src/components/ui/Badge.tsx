import type { ReactNode } from "react";
import { clsx } from "clsx";

export type BadgeTone = "slate" | "blue" | "amber" | "emerald" | "red" | "violet";

const TONE_STYLES: Record<BadgeTone, string> = {
  slate: "bg-slate-100 text-slate-700",
  blue: "bg-sky-100 text-sky-700",
  amber: "bg-amber-100 text-amber-800",
  emerald: "bg-emerald-100 text-emerald-700",
  red: "bg-red-100 text-red-700",
  violet: "bg-violet-100 text-violet-700",
};

export function Badge({ tone = "slate", children, className }: { tone?: BadgeTone; children: ReactNode; className?: string }) {
  return (
    <span className={clsx("inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium", TONE_STYLES[tone], className)}>
      {children}
    </span>
  );
}
