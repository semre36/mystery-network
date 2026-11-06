import React from "react";
import Link from "next/link";
import { Award, Medal, ArrowRight } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import type { UnlockedAchievementSummary } from "@/modules/players/types/player.types";

interface AchievementsPanelProps {
  achievements: UnlockedAchievementSummary[];
}

export function AchievementsPanel({ achievements }: AchievementsPanelProps) {
  const hasAchievements = achievements.length > 0;

  return (
    <div className="bg-[#0f1523] border border-[#1a233a] rounded-lg p-5 sm:p-6 shadow-xl space-y-5">
      <div className="flex items-center justify-between border-b border-[#18233c] pb-3">
        <div className="flex items-center gap-2">
          <Award className="w-4 h-4 text-amber-400" />
          <h3 className="text-sm font-semibold tracking-tight text-slate-100 font-sans">
            Unlocked Commendations
          </h3>
        </div>
        <Link
          href="/achievements"
          className="text-[11px] font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors"
        >
          All Badges
          <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      {hasAchievements ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {achievements.map((item) => (
            <div
              key={item.id}
              className="p-3 rounded bg-[#0b101c] border border-[#18233a] flex items-start gap-3"
            >
              <div className="p-2 rounded bg-amber-950/40 border border-amber-800/40 text-amber-400 shrink-0">
                <Medal className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="text-xs font-semibold text-slate-200 truncate font-sans">
                    {item.title}
                  </span>
                  <span className="text-[9px] font-mono px-1 rounded bg-[#131b2e] border border-[#232f48] text-slate-400 uppercase">
                    {item.category}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                  {item.description}
                </p>
                <span className="text-[10px] font-mono text-slate-500 mt-1 block">
                  Unlocked: {new Date(item.unlockedAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Award}
          badge="AWAITING MILESTONES"
          title="No commendations earned yet."
          description="Investigation achievements and detective medals are awarded for examining forensic clues, decrypting logic ciphers, and filing verified case theories."
          action={{
            label: "Inspect Commendation Catalog",
            href: "/achievements",
          }}
        />
      )}
    </div>
  );
}
