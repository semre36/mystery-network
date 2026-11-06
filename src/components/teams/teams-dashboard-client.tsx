"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Users,
  Plus,
  Shield,
  Search,
  ExternalLink,
  Crown,
  ChevronRight,
  FolderGit2,
} from "lucide-react";
import type { TeamSummaryDto } from "@/modules/teams/types/team.types";
import { CreateTeamModal } from "./create-team-modal";

interface TeamsDashboardClientProps {
  initialSquads: TeamSummaryDto[];
}

export function TeamsDashboardClient({ initialSquads }: TeamsDashboardClientProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const filteredSquads = initialSquads.filter(
    (s) =>
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.teamCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.description && s.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <>
      <div className="space-y-6">
        {/* Header Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#182236]">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-[10px] text-cyan-400 uppercase tracking-widest px-2 py-0.5 rounded bg-cyan-950/50 border border-cyan-800/60 flex items-center gap-1.5">
                <Users className="w-3 h-3 text-cyan-400" />
                <span>Tactical Operative Units</span>
              </span>
              <span className="text-slate-500 text-xs font-mono">&bull;</span>
              <span className="text-slate-400 text-xs font-mono">Team Collaboration</span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight font-sans">
              Investigative Squads
            </h1>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl font-mono">
              Collaborate in multi-participant investigations, distribute evidence, and coordinate
              field directives.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-mono text-xs font-bold uppercase tracking-wider transition-all shadow-lg shadow-cyan-950 shrink-0"
          >
            <Plus className="w-4 h-4 text-slate-950" />
            <span>Commission Squad</span>
          </button>
        </div>

        {/* Filter bar */}
        {initialSquads.length > 0 && (
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Filter by callsign, code, or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-[#0c1322] border border-[#1e2a44] text-xs font-mono text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 transition-colors"
              />
            </div>
          </div>
        )}

        {/* Squad Cards Grid */}
        {filteredSquads.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#1f2c47] bg-[#080d1a]/60 p-12 text-center">
            <div className="w-12 h-12 rounded-xl bg-[#0e172a] border border-[#23314f] flex items-center justify-center mx-auto text-cyan-400 mb-4">
              <Users className="w-6 h-6" />
            </div>
            <h2 className="text-base font-bold text-white font-sans mb-1">
              {searchTerm ? "No Matching Squads" : "No Active Squad Commissions"}
            </h2>
            <p className="text-xs text-slate-400 font-mono max-w-md mx-auto mb-6">
              {searchTerm
                ? "No tactical units match your filter criteria. Try adjusting your query."
                : "You are not currently enrolled in any operative squads. Establish your own unit or accept an invitation from another investigator."}
            </p>
            {!searchTerm && (
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-mono text-xs font-bold uppercase tracking-wider transition-all shadow-md shadow-cyan-950"
              >
                <Plus className="w-4 h-4 text-slate-950" />
                <span>Commission Your First Squad</span>
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSquads.map((squad) => {
              const isLeader = squad.myRole === "LEAD_INVESTIGATOR";

              return (
                <Link
                  key={squad.id}
                  href={`/teams/${squad.id}`}
                  className="group block rounded-2xl bg-gradient-to-br from-[#0c1424] to-[#080d19] border border-[#1a253c] hover:border-cyan-500/50 p-5 transition-all shadow-lg hover:shadow-cyan-950/20"
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-800/60">
                          {squad.teamCode}
                        </span>
                        {isLeader && (
                          <span className="font-mono text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-800/60 flex items-center gap-1">
                            <Crown className="w-2.5 h-2.5 text-amber-400" />
                            <span>Leader</span>
                          </span>
                        )}
                      </div>
                      <h2 className="text-lg font-bold text-white group-hover:text-cyan-300 transition-colors font-sans line-clamp-1">
                        {squad.name}
                      </h2>
                    </div>

                    <div className="text-slate-500 group-hover:text-cyan-400 transition-colors">
                      <ChevronRight className="w-5 h-5" />
                    </div>
                  </div>

                  {squad.description && (
                    <p className="text-xs text-slate-400 line-clamp-2 mb-4 leading-relaxed font-sans">
                      {squad.description}
                    </p>
                  )}

                  <div className="pt-4 border-t border-[#162033] flex items-center justify-between text-xs font-mono text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-slate-500" />
                      <span>
                        {squad.memberCount} {squad.memberCount === 1 ? "Operative" : "Operatives"}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <FolderGit2 className="w-3.5 h-3.5 text-cyan-400" />
                      <span className="text-slate-300 font-semibold">
                        {squad.activeInvestigationCount} Active Cases
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      <CreateTeamModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
}
