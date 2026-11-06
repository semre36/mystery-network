import React from "react";
import { ShieldCheck, Calendar, Sparkles } from "lucide-react";
import type { PlayerDossier } from "@/modules/players/types/player.types";

interface WelcomeHeaderProps {
  dossier: PlayerDossier;
}

export function WelcomeHeader({ dossier }: WelcomeHeaderProps) {
  const formattedJoinDate = new Date(dossier.joinedAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="bg-[#0f1523] border border-[#1a233a] rounded-lg p-5 sm:p-6 shadow-xl relative overflow-hidden">
      {/* Background Accent */}
      <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-cyan-950/20 to-transparent pointer-events-none" />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
        <div className="flex items-start sm:items-center gap-4">
          {/* Avatar / Initials Fallback */}
          <div className="w-12 h-12 rounded-lg bg-[#141d30] border border-[#22304d] flex items-center justify-center font-mono text-base font-bold text-cyan-400 shrink-0 shadow-inner">
            {dossier.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={dossier.avatarUrl}
                alt={dossier.codename}
                className="w-full h-full object-cover rounded-lg"
              />
            ) : (
              dossier.codename.slice(0, 2).toUpperCase()
            )}
          </div>

          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-mono uppercase tracking-widest text-cyan-400 font-semibold">
                CLEARANCE VERIFIED
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-950/60 border border-blue-800/50 text-blue-300">
                STATUS: {dossier.status}
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-100 font-sans">
              Welcome back, <span className="font-mono text-cyan-300">{dossier.codename}</span>
            </h1>

            <p className="text-xs text-slate-400 font-mono">
              Operative Classification: <span className="text-slate-200">{dossier.rank.title}</span>{" "}
              ({dossier.rank.clearanceLevel})
            </p>
          </div>
        </div>

        {/* Level / Join Info */}
        <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 border-[#1a233a] pt-3 sm:pt-0 gap-1 text-right">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-[#131b2e] border border-[#22304d] text-cyan-300 font-mono text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            Rank Tier: Level {dossier.level}
          </div>
          <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
            <Calendar className="w-3 h-3 text-slate-500" />
            Enrolled: {formattedJoinDate}
          </span>
        </div>
      </div>
    </div>
  );
}
