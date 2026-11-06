import React from "react";
import Link from "next/link";
import { Shield, Fingerprint, Award, FileText, ArrowRight } from "lucide-react";
import type { PlayerDossier } from "@/modules/players/types/player.types";

interface InvestigatorDossierCardProps {
  dossier: PlayerDossier;
}

export function InvestigatorDossierCard({ dossier }: InvestigatorDossierCardProps) {
  return (
    <div className="bg-[#0f1523] border border-[#1a233a] rounded-lg p-5 sm:p-6 shadow-xl flex flex-col justify-between relative overflow-hidden">
      {/* Background Micro Watermark */}
      <div className="absolute right-3 top-3 pointer-events-none opacity-5 text-slate-100">
        <Fingerprint className="w-28 h-28" />
      </div>

      <div>
        {/* Card Header */}
        <div className="flex items-center justify-between gap-3 mb-5 border-b border-[#18233c] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded bg-[#131b2e] border border-[#232f48] text-cyan-400">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-cyan-400 block font-semibold">
                CENTRAL REGISTRY DOSSIER
              </span>
              <span className="text-[11px] font-mono text-slate-400">
                REF: {dossier.id.slice(0, 8).toUpperCase()}
              </span>
            </div>
          </div>

          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950/70 border border-cyan-800 text-cyan-300 font-semibold">
            {dossier.rank.badge}
          </span>
        </div>

        {/* Dossier Attributes Grid */}
        <div className="space-y-3.5 mb-6">
          <div className="grid grid-cols-2 gap-3">
            <div className="p-2.5 rounded bg-[#0b101c] border border-[#18233a]">
              <span className="text-[10px] font-mono uppercase text-slate-500 block mb-0.5">
                Official Callsign
              </span>
              <span className="text-sm font-mono font-semibold text-slate-100 truncate block">
                {dossier.codename}
              </span>
            </div>

            <div className="p-2.5 rounded bg-[#0b101c] border border-[#18233a]">
              <span className="text-[10px] font-mono uppercase text-slate-500 block mb-0.5">
                Investigator Rank
              </span>
              <span className="text-sm font-sans font-medium text-slate-200 truncate block">
                {dossier.rank.title}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-2.5 rounded bg-[#0b101c] border border-[#18233a]">
              <span className="text-[10px] font-mono uppercase text-slate-500 block mb-0.5">
                Specialization
              </span>
              <span className="text-xs font-mono text-cyan-300 truncate block">
                {dossier.specialization}
              </span>
            </div>

            <div className="p-2.5 rounded bg-[#0b101c] border border-[#18233a]">
              <span className="text-[10px] font-mono uppercase text-slate-500 block mb-0.5">
                Total Accrued XP
              </span>
              <span className="text-xs font-mono text-amber-300 truncate block font-semibold">
                {dossier.xp.toLocaleString()} XP
              </span>
            </div>
          </div>

          <div className="p-2.5 rounded bg-[#0b101c] border border-[#18233a]">
            <span className="text-[10px] font-mono uppercase text-slate-500 block mb-0.5">
              Identity Description
            </span>
            <p className="text-xs text-slate-300 font-sans">
              Operative {dossier.displayName} enrolled under global detective jurisdiction.
            </p>
          </div>
        </div>
      </div>

      {/* Footer Link */}
      <div className="border-t border-[#18233c] pt-3 flex items-center justify-between">
        <span className="text-[10px] font-mono text-slate-500">
          CLEARANCE: {dossier.rank.clearanceLevel}
        </span>
        <Link
          href="/profile"
          className="inline-flex items-center gap-1 text-xs font-mono text-cyan-400 hover:text-cyan-300 transition-colors"
        >
          Manage Dossier
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}
