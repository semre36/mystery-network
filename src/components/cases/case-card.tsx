"use client";

import React from "react";
import Link from "next/link";
import { Clock, Users, BookOpen, UserCheck, ShieldAlert, ArrowRight } from "lucide-react";
import { CaseDifficulty } from "@prisma/client";
import type { SafeCaseSummaryDto } from "@/modules/cases/types/case.types";

interface CaseCardProps {
  caseData: SafeCaseSummaryDto;
}

const DIFFICULTY_CONFIG: Record<
  CaseDifficulty,
  { label: string; bg: string; border: string; text: string }
> = {
  EASY: {
    label: "Level 1 • Low Threat",
    bg: "bg-emerald-950/40",
    border: "border-emerald-800/50",
    text: "text-emerald-400",
  },
  MEDIUM: {
    label: "Level 2 • Moderate Threat",
    bg: "bg-amber-950/40",
    border: "border-amber-800/50",
    text: "text-amber-400",
  },
  HARD: {
    label: "Level 3 • High Threat",
    bg: "bg-orange-950/40",
    border: "border-orange-800/50",
    text: "text-orange-400",
  },
  EXPERT: {
    label: "Level 4 • Maximum Severity",
    bg: "bg-rose-950/40",
    border: "border-rose-800/50",
    text: "text-rose-400",
  },
};

export function CaseCard({ caseData }: CaseCardProps) {
  const diff = DIFFICULTY_CONFIG[caseData.difficulty] ?? DIFFICULTY_CONFIG.MEDIUM;

  return (
    <div className="group relative flex flex-col justify-between rounded-xl bg-[#0d1424] border border-[#1e2a42] hover:border-cyan-500/40 transition-all duration-300 hover:shadow-[0_0_25px_rgba(6,182,212,0.12)] p-5 overflow-hidden">
      {/* Corner Top Cyber Accent */}
      <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-cyan-500/10 via-transparent to-transparent pointer-events-none" />

      <div>
        {/* Header: Code & Classification Badge */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <span className="font-mono text-[11px] text-cyan-400 font-semibold tracking-wider px-2 py-0.5 rounded bg-cyan-950/40 border border-cyan-800/50">
            {caseData.caseCode}
          </span>
          <span
            className={`font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded border ${diff.bg} ${diff.border} ${diff.text}`}
          >
            {diff.label}
          </span>
        </div>

        {/* Campaign Affiliation Tag */}
        {caseData.campaign && (
          <Link
            href={`/campaigns/${caseData.campaign.slug}`}
            className="inline-flex items-center gap-1.5 text-[11px] font-mono text-slate-400 hover:text-cyan-300 transition-colors mb-2"
          >
            <BookOpen className="w-3 h-3 text-cyan-500" />
            <span className="truncate">Campaign: {caseData.campaign.title}</span>
          </Link>
        )}

        {/* Title */}
        <h3 className="text-base font-semibold text-slate-100 group-hover:text-cyan-200 transition-colors line-clamp-1 mb-2 font-sans">
          {caseData.title}
        </h3>

        {/* Synopsis */}
        <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed mb-4">
          {caseData.description}
        </p>
      </div>

      {/* Footer Details & Action */}
      <div className="pt-4 border-t border-[#192338] space-y-3.5">
        {/* Intelligence Metrics */}
        <div className="grid grid-cols-3 gap-2 text-[11px] font-mono text-slate-400">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span>{caseData.estimatedDurationMinutes}m est.</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span>
              {caseData.minPlayers === caseData.maxPlayers
                ? `${caseData.minPlayers} Operative`
                : `${caseData.minPlayers}-${caseData.maxPlayers} Ops`}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <UserCheck className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span>{caseData.characterCount} Dossiers</span>
          </div>
        </div>

        {/* Play Mode & Action CTA */}
        <div className="flex items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-1">
            {caseData.supportedPlayModes.map((mode) => (
              <span
                key={mode}
                className="text-[9px] font-mono tracking-wider px-1.5 py-0.5 rounded bg-[#131b2e] text-slate-400 border border-[#22304d]"
              >
                {mode}
              </span>
            ))}
          </div>

          <Link
            href={`/cases/${caseData.caseCode}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/35 border border-blue-500/40 text-blue-200 hover:text-cyan-200 font-mono text-xs font-semibold transition-all group-hover:border-cyan-400/50"
          >
            <span>ACCESS DOSSIER</span>
            <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>
      </div>
    </div>
  );
}
