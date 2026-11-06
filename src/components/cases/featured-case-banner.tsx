import React from "react";
import Link from "next/link";
import { ShieldAlert, Clock, Users, BookOpen, ArrowRight, Radio } from "lucide-react";
import type { SafeCaseSummaryDto } from "@/modules/cases/types/case.types";

interface FeaturedCaseBannerProps {
  caseData: SafeCaseSummaryDto;
}

export function FeaturedCaseBanner({ caseData }: FeaturedCaseBannerProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0c1324] via-[#09101d] to-[#060a14] border border-cyan-500/30 p-6 md:p-8 mb-8 shadow-[0_0_40px_rgba(6,182,212,0.12)]">
      {/* Background Cyber Grid Accent */}
      <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] opacity-25 pointer-events-none" />

      {/* Pulsing Tactical Indicator */}
      <div className="relative flex items-center gap-2 mb-4">
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-950/60 border border-cyan-500/40 text-cyan-300 font-mono text-[10px] uppercase tracking-widest">
          <Radio className="w-3 h-3 text-cyan-400 animate-pulse" />
          <span>Priority One Operation</span>
        </div>
        <span className="font-mono text-[10px] text-slate-500 uppercase tracking-widest hidden sm:inline">
          Global Relay Directive
        </span>
      </div>

      <div className="relative grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
        {/* Left Column: Briefing Synopsis */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs font-semibold text-cyan-400 px-2 py-0.5 rounded bg-cyan-950/50 border border-cyan-800/60">
              {caseData.caseCode}
            </span>
            {caseData.campaign && (
              <span className="flex items-center gap-1.5 text-xs font-mono text-slate-400">
                <BookOpen className="w-3.5 h-3.5 text-cyan-500" />
                {caseData.campaign.title}
              </span>
            )}
          </div>

          <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight font-sans">
            {caseData.title}
          </h2>

          <p className="text-sm text-slate-300 leading-relaxed max-w-2xl">{caseData.description}</p>

          {/* Quick Metrics */}
          <div className="flex items-center flex-wrap gap-4 pt-2 text-xs font-mono text-slate-400">
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-cyan-400" />
              <span>{caseData.estimatedDurationMinutes} Minutes</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Users className="w-4 h-4 text-cyan-400" />
              <span>
                {caseData.minPlayers === caseData.maxPlayers
                  ? `${caseData.minPlayers} Operative`
                  : `${caseData.minPlayers}-${caseData.maxPlayers} Operatives`}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              <span className="text-amber-300 font-semibold">{caseData.difficulty} Tier</span>
            </div>
          </div>
        </div>

        {/* Right Column: CTA Box */}
        <div className="lg:col-span-1 flex flex-col sm:flex-row lg:flex-col justify-center items-start lg:items-end gap-3 pt-2 lg:pt-0">
          <Link
            href={`/cases/${caseData.caseCode}`}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-mono text-sm font-semibold shadow-lg shadow-cyan-950/60 hover:shadow-cyan-500/25 transition-all duration-200 group"
          >
            <span>ACCESS CASE BRIEFING</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>

          <span className="text-[10px] font-mono text-slate-400 text-left lg:text-right">
            Full classified dossier &bull; {caseData.chapterCount} Tactical Acts
          </span>
        </div>
      </div>
    </div>
  );
}
