import React from "react";
import Link from "next/link";
import { FolderSearch, CheckCircle2, FileSearch, ArrowRight } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import type { PlayerDashboardStats } from "@/modules/players/types/player.types";

interface InvestigationOverviewProps {
  stats: PlayerDashboardStats;
}

export function InvestigationOverview({ stats }: InvestigationOverviewProps) {
  const hasActiveInvestigations = stats.activeInvestigations > 0;

  return (
    <div className="bg-[#0f1523] border border-[#1a233a] rounded-lg p-5 sm:p-6 shadow-xl space-y-5">
      <div className="flex items-center justify-between border-b border-[#18233c] pb-3">
        <div className="flex items-center gap-2">
          <FolderSearch className="w-4 h-4 text-cyan-400" />
          <h3 className="text-sm font-semibold tracking-tight text-slate-100 font-sans">
            Investigation Operations Overview
          </h3>
        </div>
        <Link
          href="/cases"
          className="text-[11px] font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors"
        >
          View Case Registry
          <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-3 rounded bg-[#0b101c] border border-[#18233a] text-center">
          <span className="text-[10px] font-mono uppercase text-slate-500 block mb-1">
            Active Cases
          </span>
          <span className="text-xl font-bold font-mono text-cyan-300">
            {stats.activeInvestigations}
          </span>
        </div>

        <div className="p-3 rounded bg-[#0b101c] border border-[#18233a] text-center">
          <span className="text-[10px] font-mono uppercase text-slate-500 block mb-1">
            Solved Cases
          </span>
          <span className="text-xl font-bold font-mono text-emerald-400">
            {stats.completedInvestigations}
          </span>
        </div>

        <div className="p-3 rounded bg-[#0b101c] border border-[#18233a] text-center">
          <span className="text-[10px] font-mono uppercase text-slate-500 block mb-1">
            Clues Collected
          </span>
          <span className="text-xl font-bold font-mono text-amber-300">
            {stats.totalCluesCollected}
          </span>
        </div>
      </div>

      {/* Conditional State: Active vs Empty */}
      {hasActiveInvestigations ? (
        <div className="border border-cyan-900/40 bg-cyan-950/20 rounded p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-cyan-400 shrink-0" />
            <div>
              <span className="text-xs font-semibold text-slate-200 block">
                Active Operations in Progress
              </span>
              <span className="text-[11px] font-mono text-slate-400">
                You have {stats.activeInvestigations} active investigation assignment.
              </span>
            </div>
          </div>
          <Link
            href="/investigations"
            className="text-xs font-mono px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white font-medium transition-colors"
          >
            Resume Field Session
          </Link>
        </div>
      ) : (
        <EmptyState
          icon={FileSearch}
          badge="OPERATIONS STANDBY"
          title="Your investigation record is waiting."
          description="No active field investigations yet. New mystery cases and team dossiers will appear here when the investigation network deploys its next operations."
          action={{
            label: "Explore Upcoming Cases",
            href: "/cases",
          }}
        />
      )}
    </div>
  );
}
