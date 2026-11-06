import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/modules/authentication/guards/auth.guard";
import { InvestigationService } from "@/modules/investigations/services/investigation.service";
import { WorkspaceHeader } from "@/components/investigations/workspace-header";
import { ChapterProgressionBoard } from "@/components/investigations/chapter-progression-board";
import { UserCheck, FileKey, Network, Users2, KeyRound } from "lucide-react";

export const dynamic = "force-dynamic";

interface InvestigationWorkspacePageProps {
  params: Promise<{ investigationId: string }>;
}

export async function generateMetadata({ params }: InvestigationWorkspacePageProps) {
  const { investigationId } = await params;
  return {
    title: `Investigation Workspace (${investigationId.slice(0, 8)}) | MYSTERY NETWORK`,
  };
}

export default async function InvestigationWorkspacePage({
  params,
}: InvestigationWorkspacePageProps) {
  const user = await getCurrentUser();
  if (!user) return null;

  const { investigationId } = await params;

  let workspace;
  try {
    workspace = await InvestigationService.getInvestigationWorkspace(user.id, investigationId);
  } catch {
    notFound();
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      {/* Workspace Tactical Header & Actions */}
      <WorkspaceHeader workspace={workspace} />

      {/* Main Chapter Progression Engine */}
      <section aria-label="Investigation Chapter Progression">
        <ChapterProgressionBoard
          investigationId={workspace.id}
          investigationStatus={workspace.status}
          chapters={workspace.chapters}
        />
      </section>

      {/* Persons of Interest / Public Dossiers */}
      <section aria-label="Persons of Interest">
        <div className="flex items-center justify-between pb-3 border-b border-[#182236] mb-4">
          <div className="flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-cyan-400" />
            <h2 className="text-base font-semibold text-white font-sans">
              Persons of Interest & Dossiers ({workspace.characters.length})
            </h2>
          </div>
          <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">
            De-Classified Records
          </span>
        </div>

        {workspace.characters.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {workspace.characters.map((character) => (
              <div
                key={character.id}
                className="rounded-xl bg-[#0d1424] border border-[#1e2a42] p-4 space-y-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="text-sm font-semibold text-slate-100 font-sans">
                      {character.name}
                    </h4>
                    {character.role && (
                      <span className="text-[11px] font-mono text-cyan-400 block">
                        {character.role}
                      </span>
                    )}
                  </div>
                  {character.clearance && (
                    <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-red-950/40 border border-red-800/50 text-red-300 uppercase tracking-wider shrink-0">
                      {character.clearance}
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-400 leading-relaxed">{character.description}</p>

                {character.location && (
                  <div className="text-[10px] font-mono text-slate-500 pt-1">
                    Last known locale: <span className="text-slate-300">{character.location}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-lg bg-[#0d1424] border border-[#1e2a42] p-6 text-center text-xs font-mono text-slate-400">
            No public personnel records attached to this operational file.
          </div>
        )}
      </section>

      {/* Reserved Future Feature Panels (Clearly marked Coming Soon) */}
      <section aria-label="Upcoming Tactical Modules" className="space-y-4">
        <div className="text-xs font-mono text-slate-500 uppercase tracking-wider pb-2 border-b border-[#182236]">
          Connected Station Peripherals (Phased Deployment)
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Link
            href={`/investigations/${workspace.id}/evidence`}
            className="group rounded-xl bg-[#0c1222] border border-cyan-500/40 p-4 space-y-2 hover:border-cyan-400 hover:bg-[#10192e] transition-all shadow-md shadow-cyan-950/20 cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <FileKey className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
              <span className="text-[9px] font-mono text-cyan-300 uppercase px-1.5 py-0.5 rounded bg-cyan-950/60 border border-cyan-700/60">
                Active Vault
              </span>
            </div>
            <div className="text-xs font-semibold text-slate-100 group-hover:text-cyan-200 transition-colors font-sans flex items-center justify-between">
              <span>Evidence Vault</span>
              <span className="text-[10px] text-cyan-400 font-mono">Access →</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Discover, inspect, annotate, and transmit classified clues.
            </p>
          </Link>

          <div className="rounded-xl bg-[#0a0f1b] border border-[#151f33] p-4 space-y-2 opacity-75">
            <div className="flex items-center justify-between">
              <Users2 className="w-4 h-4 text-slate-500" />
              <span className="text-[9px] font-mono text-slate-500 uppercase px-1.5 py-0.5 rounded bg-[#101726] border border-[#1c273e]">
                Phase 09
              </span>
            </div>
            <div className="text-xs font-semibold text-slate-300 font-sans">Squad Sync</div>
            <p className="text-[11px] text-slate-500">
              Multi-operative channel & evidence trading room.
            </p>
          </div>

          <Link
            href={`/investigations/${workspace.id}/puzzles`}
            className="group rounded-xl bg-[#0c1222] border border-amber-500/40 p-4 space-y-2 hover:border-amber-400 hover:bg-[#10192e] transition-all shadow-md shadow-amber-950/20 cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <KeyRound className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
              <span className="text-[9px] font-mono text-amber-300 uppercase px-1.5 py-0.5 rounded bg-amber-950/60 border border-amber-700/60">
                Active Console
              </span>
            </div>
            <div className="text-xs font-semibold text-slate-100 group-hover:text-amber-200 transition-colors font-sans flex items-center justify-between">
              <span>Cipher Terminal</span>
              <span className="text-[10px] text-amber-400 font-mono">Access →</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Cryptograms, frequency analysis & logic puzzles.
            </p>
          </Link>

          <div className="rounded-xl bg-[#0a0f1b] border border-[#151f33] p-4 space-y-2 opacity-75">
            <div className="flex items-center justify-between">
              <Network className="w-4 h-4 text-slate-500" />
              <span className="text-[9px] font-mono text-slate-500 uppercase px-1.5 py-0.5 rounded bg-[#101726] border border-[#1c273e]">
                Phase 11
              </span>
            </div>
            <div className="text-xs font-semibold text-slate-300 font-sans">Crime Board</div>
            <p className="text-[11px] text-slate-500">
              Visual corkboard linking suspects, timelines & clues.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
