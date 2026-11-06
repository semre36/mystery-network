import React from "react";
import Link from "next/link";
import { Clock, ArrowRight, ShieldAlert, Layers, CheckCircle2, Radio } from "lucide-react";
import { InvestigationStatus, CaseDifficulty } from "@prisma/client";
import type { SafeInvestigationSummaryDto } from "@/modules/investigations/types/investigation.types";

interface InvestigationCardProps {
  investigation: SafeInvestigationSummaryDto;
}

const STATUS_BADGE: Record<
  InvestigationStatus,
  { label: string; bg: string; border: string; text: string }
> = {
  NOT_STARTED: {
    label: "Standby",
    bg: "bg-slate-900/50",
    border: "border-slate-700/60",
    text: "text-slate-400",
  },
  IN_PROGRESS: {
    label: "Active",
    bg: "bg-cyan-950/60",
    border: "border-cyan-500/50",
    text: "text-cyan-300",
  },
  PAUSED: {
    label: "Paused",
    bg: "bg-amber-950/50",
    border: "border-amber-800/60",
    text: "text-amber-400",
  },
  SOLVED: {
    label: "Solved",
    bg: "bg-emerald-950/60",
    border: "border-emerald-600/60",
    text: "text-emerald-300",
  },
  FAILED: {
    label: "Failed",
    bg: "bg-rose-950/60",
    border: "border-rose-800/60",
    text: "text-rose-400",
  },
  ABANDONED: {
    label: "Abandoned",
    bg: "bg-slate-950/60",
    border: "border-slate-800/60",
    text: "text-slate-500",
  },
};

export function InvestigationCard({ investigation }: InvestigationCardProps) {
  const badge = STATUS_BADGE[investigation.status] ?? STATUS_BADGE.IN_PROGRESS;

  return (
    <div className="group relative rounded-xl bg-[#0d1424] border border-[#1e2a42] hover:border-cyan-500/40 p-5 flex flex-col justify-between transition-all duration-300 hover:shadow-[0_0_25px_rgba(6,182,212,0.1)]">
      <div>
        {/* Header: Code & Status */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <span className="font-mono text-[11px] text-cyan-400 font-semibold px-2 py-0.5 rounded bg-cyan-950/40 border border-cyan-800/50">
            {investigation.caseCode}
          </span>
          <span
            className={`font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded border flex items-center gap-1 ${badge.bg} ${badge.border} ${badge.text}`}
          >
            {investigation.status === InvestigationStatus.IN_PROGRESS && (
              <Radio className="w-2.5 h-2.5 animate-pulse text-cyan-400" />
            )}
            <span>{badge.label}</span>
          </span>
        </div>

        {/* Case Title */}
        <h3 className="text-base font-semibold text-slate-100 group-hover:text-cyan-200 transition-colors mb-2 font-sans line-clamp-1">
          {investigation.caseTitle}
        </h3>

        {/* Progress Summary */}
        <div className="space-y-1.5 my-3 text-xs font-mono text-slate-400">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-cyan-500" />
              <span>Tactical Acts</span>
            </span>
            <span className="text-slate-200">
              {investigation.completedChaptersCount} / {investigation.totalChapters} Concluded
            </span>
          </div>

          <div className="w-full bg-[#121929] rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                investigation.status === InvestigationStatus.SOLVED
                  ? "bg-emerald-400"
                  : "bg-cyan-400"
              }`}
              style={{
                width: `${
                  investigation.totalChapters > 0
                    ? Math.round(
                        (investigation.completedChaptersCount / investigation.totalChapters) * 100
                      )
                    : 0
                }%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* Footer Info & Action */}
      <div className="pt-4 border-t border-[#192338] flex items-center justify-between">
        <div className="text-[10px] font-mono text-slate-500">
          Last active: {new Date(investigation.lastActiveAt).toLocaleDateString()}
        </div>

        <Link
          href={`/investigations/${investigation.id}`}
          className="inline-flex items-center gap-1.5 text-xs font-mono text-cyan-400 hover:text-cyan-300 font-semibold transition-colors"
        >
          <span>
            {investigation.status === InvestigationStatus.SOLVED ? "REVIEW FILE" : "OPEN WORKSPACE"}
          </span>
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>
    </div>
  );
}
