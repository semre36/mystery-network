"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  Users,
  UserPlus,
  Crown,
  Shield,
  Clock,
  Radio,
  Trash2,
  LogOut,
  FolderGit2,
  Award,
  AlertTriangle,
  Play,
  Loader2,
} from "lucide-react";
import type { TeamDetailDto } from "@/modules/teams/types/team.types";
import { InviteMemberModal } from "./invite-member-modal";
import { TransferLeadershipModal } from "./transfer-leadership-modal";

interface TeamDetailClientProps {
  team: TeamDetailDto;
  currentPlayerId: string;
}

export function TeamDetailClient({ team, currentPlayerId }: TeamDetailClientProps) {
  const router = useRouter();
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isLeader = team.myRole === "LEAD_INVESTIGATOR";

  const handleLeaveTeam = async () => {
    const confirm = window.confirm(
      isLeader
        ? "You are the squad leader. If there are no other operatives, the squad will be disbanded. Are you sure you wish to leave?"
        : "Are you sure you wish to leave this squad?"
    );
    if (!confirm) return;

    setActionLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/teams/${team.id}/members/me`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to leave squad");
      }

      router.push("/teams");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Departure failed");
      setActionLoading(false);
    }
  };

  const handleRemoveMember = async (targetPlayerId: string, codename: string) => {
    const confirm = window.confirm(
      `Are you sure you wish to remove operative '${codename}' from the squad roster?`
    );
    if (!confirm) return;

    setActionLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/teams/${team.id}/members/${targetPlayerId}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to remove operative");
      }

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Removal failed");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Return Link */}
      <div className="flex items-center justify-between">
        <Link
          href="/teams"
          className="inline-flex items-center gap-1.5 text-xs font-mono text-slate-400 hover:text-cyan-300 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>RETURN TO SQUADS DIRECTORY</span>
        </Link>

        <span className="text-[10px] font-mono text-slate-500">
          SQUAD ID: {team.id.slice(0, 8)}...
        </span>
      </div>

      {/* Main Squad Dossier Header */}
      <div className="rounded-2xl bg-gradient-to-br from-[#0c1424] via-[#09101d] to-[#070b16] border border-[#1e2a44] p-6 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-semibold text-cyan-400 px-2.5 py-1 rounded bg-cyan-950/60 border border-cyan-800/60">
              {team.teamCode}
            </span>
            <span className="font-mono text-[11px] uppercase tracking-wider px-2.5 py-1 rounded border border-emerald-800/60 bg-emerald-950/60 text-emerald-300">
              {team.status}
            </span>
            <span className="font-mono text-[11px] uppercase tracking-wider px-2.5 py-1 rounded border border-purple-800/60 bg-purple-950/60 text-purple-300 flex items-center gap-1">
              <Shield className="w-3 h-3" />
              <span>Role: {team.myRole}</span>
            </span>
          </div>

          <div className="flex items-center gap-2 font-mono text-[11px] text-slate-400">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <span>ESTABLISHED {new Date(team.createdAt).toLocaleDateString()}</span>
          </div>
        </div>

        <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight mb-2 font-sans">
          {team.name}
        </h1>

        {team.description && (
          <p className="text-xs md:text-sm text-slate-300 leading-relaxed max-w-3xl mb-6">
            {team.description}
          </p>
        )}

        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-[#18233a]">
          <div className="flex items-center gap-3 text-xs font-mono text-slate-400">
            <span>
              Operatives: <strong className="text-white">{team.members.length}</strong>
            </span>
            <span>&bull;</span>
            <span>
              Active Cases:{" "}
              <strong className="text-cyan-300">{team.activeInvestigations.length}</strong>
            </span>
          </div>

          <div className="flex items-center gap-2">
            {isLeader && (
              <>
                <button
                  type="button"
                  onClick={() => setIsInviteModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-slate-950 text-xs font-mono font-bold transition-colors"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Invite Operative</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsTransferModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#141c2e] hover:bg-[#1b263e] border border-[#23314f] text-amber-300 text-xs font-mono transition-colors"
                >
                  <Award className="w-3.5 h-3.5 text-amber-400" />
                  <span>Transfer Command</span>
                </button>
              </>
            )}

            <button
              type="button"
              onClick={handleLeaveTeam}
              disabled={actionLoading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-950/30 hover:bg-rose-900/40 border border-rose-800/40 text-rose-300 text-xs font-mono transition-colors disabled:opacity-50"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Leave Squad</span>
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-3 text-xs font-mono text-rose-400 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Grid: Squad Roster + Active Investigations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Squad Roster (Left 2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white font-sans flex items-center gap-2">
              <Users className="w-4 h-4 text-cyan-400" />
              <span>Operative Roster ({team.members.length})</span>
            </h2>
          </div>

          <div className="rounded-2xl bg-[#090e1a] border border-[#1a253c] divide-y divide-[#162033] overflow-hidden">
            {team.members.map((member) => {
              const isMemberLeader = member.role === "LEAD_INVESTIGATOR";
              const isCurrent = member.playerId === currentPlayerId;

              return (
                <div
                  key={member.id}
                  className="p-4 flex items-center justify-between gap-4 hover:bg-[#0c1424]/40 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center font-mono text-sm font-bold text-slate-300">
                      {member.codename.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white font-sans">
                          {member.codename}
                        </span>
                        {isCurrent && (
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800/60">
                            YOU
                          </span>
                        )}
                        {isMemberLeader && (
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800/60 flex items-center gap-1 font-bold">
                            <Crown className="w-2.5 h-2.5 text-amber-400" />
                            <span>LEAD</span>
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 font-mono mt-0.5">
                        {member.displayName} &bull; Joined{" "}
                        {new Date(member.joinedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  {/* Leader Removal Control */}
                  {isLeader && !isCurrent && (
                    <button
                      type="button"
                      onClick={() => handleRemoveMember(member.playerId, member.codename)}
                      disabled={actionLoading}
                      title="Remove operative from squad"
                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 transition-colors disabled:opacity-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Squad Active Investigations (Right col) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white font-sans flex items-center gap-2">
              <FolderGit2 className="w-4 h-4 text-cyan-400" />
              <span>Squad Operations</span>
            </h2>

            <Link
              href="/cases"
              className="text-xs font-mono text-cyan-400 hover:text-cyan-300 transition-colors"
            >
              Browse Cases &rarr;
            </Link>
          </div>

          {team.activeInvestigations.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#1f2c47] bg-[#080d1a]/60 p-6 text-center space-y-2">
              <p className="text-xs font-mono text-slate-400">
                No active investigation sessions running under this squad callsign.
              </p>
              <Link
                href="/cases"
                className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-cyan-400 hover:text-cyan-300 pt-2"
              >
                <span>Select a published case to deploy</span>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {team.activeInvestigations.map((inv) => (
                <div
                  key={inv.id}
                  className="rounded-xl bg-[#0a101f] border border-[#1a253c] p-4 space-y-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[10px] font-bold text-cyan-400 px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-800/60">
                      {inv.caseCode}
                    </span>
                    <span className="font-mono text-[10px] uppercase text-emerald-400">
                      {inv.status}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-white font-sans line-clamp-1">
                    {inv.caseTitle}
                  </h3>

                  {inv.currentChapterTitle && (
                    <p className="text-xs font-mono text-slate-400">
                      Current: Act {inv.currentChapterOrder} — {inv.currentChapterTitle}
                    </p>
                  )}

                  <div className="pt-2 border-t border-[#162033] flex items-center justify-between">
                    <span className="text-[11px] font-mono text-slate-500">
                      {inv.participantCount} Operatives
                    </span>

                    <Link
                      href={`/investigations/${inv.id}`}
                      className="inline-flex items-center gap-1 px-3 py-1 rounded bg-cyan-950/80 hover:bg-cyan-900/80 border border-cyan-700/60 text-cyan-300 text-xs font-mono font-semibold transition-colors"
                    >
                      <Play className="w-3 h-3" />
                      <span>Open Workspace</span>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <InviteMemberModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        teamId={team.id}
        teamName={team.name}
      />

      <TransferLeadershipModal
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
        teamId={team.id}
        members={team.members}
        currentPlayerId={currentPlayerId}
      />
    </div>
  );
}
