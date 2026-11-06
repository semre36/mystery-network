import React from "react";
import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  badge?: string;
  action?: {
    label: string;
    onClick?: () => void;
    href?: string;
  };
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  badge = "AWAITING ASSIGNMENT",
  action,
}: EmptyStateProps) {
  return (
    <div className="border border-[#1a233a] bg-[#0c121e]/60 rounded-lg p-6 sm:p-8 text-center flex flex-col items-center justify-center space-y-3">
      <div className="p-3 rounded-full bg-[#131b2e] border border-[#22304d] text-cyan-400/80 mb-1">
        <Icon className="w-5 h-5" strokeWidth={1.75} aria-hidden="true" />
      </div>

      <span className="text-[10px] font-mono uppercase tracking-widest text-cyan-400/90 px-2.5 py-0.5 rounded bg-cyan-950/40 border border-cyan-800/40">
        {badge}
      </span>

      <h4 className="text-sm font-semibold text-slate-200 tracking-tight font-sans">{title}</h4>

      <p className="text-xs text-slate-400 max-w-sm leading-relaxed">{description}</p>

      {action && (
        <div className="pt-2">
          {action.href ? (
            <a
              href={action.href}
              className="inline-flex items-center gap-1.5 text-xs font-mono px-3.5 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white transition-colors"
            >
              {action.label}
            </a>
          ) : (
            <button
              type="button"
              onClick={action.onClick}
              className="inline-flex items-center gap-1.5 text-xs font-mono px-3.5 py-1.5 rounded bg-[#131b2e] hover:bg-[#1a233a] border border-[#232f48] text-slate-200 transition-colors"
            >
              {action.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
