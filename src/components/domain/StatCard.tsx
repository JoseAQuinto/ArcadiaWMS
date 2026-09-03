import type { ComponentType } from "react";
import { clsx } from "clsx";

interface StatCardProps {
  label: string;
  value: string;
  icon: ComponentType<{ className?: string }>;
  tone?: "primary" | "emerald" | "amber" | "slate";
  hint?: string;
}

const TONE_STYLES = {
  primary: "bg-primary-50 text-primary-700",
  emerald: "bg-emerald-50 text-emerald-700",
  amber: "bg-amber-50 text-amber-700",
  slate: "bg-slate-100 text-slate-600",
};

export function StatCard({ label, value, icon: Icon, tone = "primary", hint }: StatCardProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-card">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <span className={clsx("flex h-8 w-8 items-center justify-center rounded-lg", TONE_STYLES[tone])}>
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}
