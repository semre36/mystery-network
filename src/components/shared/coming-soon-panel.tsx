import React from "react";
import Link from "next/link";
import { Lock, ArrowLeft, ShieldAlert } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface ComingSoonPanelProps {
  moduleName: string;
  moduleCode: string;
  targetPhase: string;
  scheduledPhaseName: string;
  description: string;
  icon: LucideIcon;
  deliverables: string[];
}

export function ComingSoonPanel({
  moduleName,
  moduleCode,
  targetPhase,
  scheduledPhaseName,
  description,
  icon: Icon,
  deliverables,
}: ComingSoonPanelProps) {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs font-mono text-slate-400 hover:text-cyan-400 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Return to Dashboard
        </Link>
        <div className="flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          <span className="text-[11px] font-mono text-amber-400 uppercase tracking-wider">
            Clearance Restricted
          </span>
        </div>
      </div>

      <div className="bg-[#0f1523] border border-[#1a233a] rounded-lg p-6 sm:p-10 shadow-2xl relative overflow-hidden">
        {/* Classified Watermark */}
        <div className="absolute -right-6 -bottom-6 pointer-events-none opacity-[0.03] text-slate-100 select-none">
          <Lock className="w-72 h-72" />
        </div>

        {/* Header Tag */}
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 rounded bg-[#131b2e] border border-[#232f48] text-amber-400">
            <Icon className="w-6 h-6" strokeWidth={1.75} aria-hidden="true" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono uppercase tracking-widest text-amber-400 font-semibold">
                SYSTEM MODULE {moduleCode}
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-950/60 border border-amber-800/50 text-amber-300">
                Awaiting {targetPhase}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-100 mt-1 font-sans">
              {moduleName}
            </h1>
          </div>
        </div>

        {/* Narrative / Intelligence Description */}
        <p className="text-sm text-slate-300 leading-relaxed mb-8 border-l-2 border-amber-500/70 pl-4 py-1">
          {description}
        </p>

        {/* Protocol Notice */}
        <div className="border border-[#1f2942] bg-[#0c121e]/80 rounded-md p-4 mb-8 space-y-3">
          <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
            <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="font-semibold uppercase tracking-wider text-slate-200">
              Operational Roadmap Schedule: {scheduledPhaseName}
            </span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            This module is under development per the modular monolith specification. In accordance
            with platform integrity protocols, this feature cannot be accessed prior to its
            designated phase verification.
          </p>
        </div>

        {/* Deliverables Overview */}
        <div className="space-y-3">
          <h4 className="text-xs font-mono uppercase tracking-wider text-slate-400 font-semibold">
            Scheduled Architectural Capabilities:
          </h4>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {deliverables.map((item, idx) => (
              <li
                key={idx}
                className="flex items-center gap-2 text-xs text-slate-300 bg-[#121929] border border-[#1b253b] px-3 py-2 rounded"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0" />
                <span className="font-mono text-[11px]">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
