import React from "react";
import { Sparkles, Trophy, ShieldAlert } from "lucide-react";
import type { PlayerDossier, PlayerDashboardStats } from "@/modules/players/types/player.types";

interface ProgressionPanelProps {
  dossier: PlayerDossier;
  stats: PlayerDashboardStats;
}

export function ProgressionPanel({ dossier, stats }: ProgressionPanelProps) {
  return (
    <div className="bg-[#0f1523] border border-[#1a233a] rounded-lg p-5 sm:p-6 shadow-xl space-y-5">
      <div className="flex items-center justify-between border-b border-[#18233c] pb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <h3 className="text-sm font-semibold tracking-tight text-slate-100 font-sans">
            Progression & Operational Standing
          </h3>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#131b2e] border border-[#22304d] text-slate-400">
          Rank Tier: {dossier.rank.title}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 rounded bg-[#0b101c] border border-[#18233a]">
          <span className="text-[10px] font-mono uppercase text-slate-500 block mb-1">
            Current Level
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold font-mono text-cyan-300">{dossier.level}</span>
            <span className="text-[11px] font-mono text-slate-500">Tier Rating</span>
          </div>
        </div>

        <div className="p-3 rounded bg-[#0b101c] border border-[#18233a]">
          <span className="text-[10px] font-mono uppercase text-slate-500 block mb-1">
            Accumulated XP
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold font-mono text-amber-300">
              {dossier.xp.toLocaleString()}
            </span>
            <span className="text-[11px] font-mono text-slate-500">Points</span>
          </div>
        </div>
      </div>

      <div className="p-3 rounded bg-[#0b101c] border border-[#18233a] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Trophy className="w-4 h-4 text-amber-400 shrink-0" />
          <div>
            <span className="text-xs font-semibold text-slate-200 block font-sans">
              Commendations Earned
            </span>
            <span className="text-[11px] font-mono text-slate-400">
              Verified network achievements
            </span>
          </div>
        </div>
        <span className="text-base font-bold font-mono text-slate-100">
          {stats.unlockedAchievementsCount}
        </span>
      </div>

      {/* Honest Leveling Notice */}
      <div className="border border-[#1f2942] bg-[#0c121e]/80 rounded p-3 flex items-start gap-2.5 text-xs text-slate-400 leading-relaxed font-sans">
        <ShieldAlert className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
        <p className="text-[11px]">
          Investigative XP is awarded exclusively through verified case milestones, evidence
          submissions, and puzzle decryptions. Level thresholds calibrate dynamically with each
          seasonal campaign.
        </p>
      </div>
    </div>
  );
}
