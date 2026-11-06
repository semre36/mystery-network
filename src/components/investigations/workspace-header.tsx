"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  Clock,
  Radio,
  Pause,
  Play,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Shield,
  Users,
  UserPlus,
  KeyRound,
  Network,
} from "lucide-react";
import { InvestigationStatus, CaseDifficulty } from "@prisma/client";
import type { SafeInvestigationWorkspaceDto } from "@/modules/investigations/types/investigation.types";

interface WorkspaceHeaderProps {
  workspace: SafeInvestigationWorkspaceDto;
  onRefresh?: () => void;
}

const STATUS_CONFIG: Record<
  InvestigationStatus,
  { label: string; bg: string; border: string; text: string }
> = {
  NOT_STARTED: {
    label: "Standby",
    bg: "bg-slate-900/50",
    border: "border-slate-700/60",
    text: "text-slate-400",
  },
  IN_PROGRESS: {
    label: "Active Investigation",
    bg: "bg-cyan-950/60",
    border: "border-cyan-500/50",
    text: "text-cyan-300",
  },
  PAUSED: {
    label: "Tactical Pause",
    bg: "bg-amber-950/50",
    border: "border-amber-800/60",
    text: "text-amber-400",
  },
  SOLVED: {
    label: "Case Solved",
    bg: "bg-emerald-950/60",
    border: "border-emerald-600/60",
    text: "text-emerald-300",
  },
  FAILED: {
    label: "Operation Failed",
    bg: "bg-rose-950/60",
    border: "border-rose-800/60",
    text: "text-rose-400",
  },
  ABANDONED: {
    label: "Abandoned",
    bg: "bg-slate-950/60",
    border: "border-slate-800/60",
    text: "text-slate-500",
  },
};

export function WorkspaceHeader({ workspace, onRefresh }: WorkspaceHeaderProps) {
  const router = useRouter();
  const [transitioning, setTransitioning] = useState(false);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const statusStyle = STATUS_CONFIG[workspace.status] ?? STATUS_CONFIG.IN_PROGRESS;
  const allChaptersCompleted =
    workspace.totalChapters > 0 && workspace.completedChaptersCount === workspace.totalChapters;

  const handleJoin = async () => {
    setJoining(true);
    setError(null);
    try {
      const res = await fetch(`/api/investigations/${workspace.id}/join`, {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to join squad investigation");
      }
      router.refresh();
      if (onRefresh) onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to join squad operation");
    } finally {
      setJoining(false);
    }
  };

  const handleAction = async (action: "PAUSE" | "RESUME" | "ABANDON" | "COMPLETE") => {
    if (action === "ABANDON") {
      const confirmAbandon = window.confirm(
        "Are you sure you want to abandon this investigation? This action is permanent."
      );
      if (!confirmAbandon) return;
    }

    setTransitioning(true);
    setError(null);

    try {
      const res = await fetch(`/api/investigations/${workspace.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Lifecycle transition failed");
      }

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to transition status");
    } finally {
      setTransitioning(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Squad Member Join Prompt */}
      {workspace.team?.isMember && !workspace.myParticipantStatus && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-950/30 p-4 flex flex-wrap items-center justify-between gap-4 shadow-lg backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-amber-200">
                Active Squad Operation: {workspace.team.name}
              </p>
              <p className="text-xs text-amber-300/80">
                You are an active member of this squad, but your operative status is not yet
                deployed to this active investigation session.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleJoin}
            disabled={joining}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-mono text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50 shadow-md shadow-cyan-900/30"
          >
            {joining ? (
              <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
            ) : (
              <UserPlus className="w-4 h-4 text-slate-950" />
            )}
            <span>Deploy to Squad Operation</span>
          </button>
        </div>
      )}

      {/* Back Link */}
      <div className="flex items-center justify-between">
        <Link
          href="/investigations"
          className="inline-flex items-center gap-1.5 text-xs font-mono text-slate-400 hover:text-cyan-300 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>RETURN TO INVESTIGATIONS DIRECTORY</span>
        </Link>

        <span className="text-[10px] font-mono text-slate-500 hidden sm:inline">
          SESSION ID: {workspace.id.slice(0, 8)}...
        </span>
      </div>

      {/* Main Tactical Header Box */}
      <div className="rounded-2xl bg-gradient-to-br from-[#0c1424] via-[#09101d] to-[#070b16] border border-[#1e2a44] p-6 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs font-semibold text-cyan-400 px-2.5 py-1 rounded bg-cyan-950/60 border border-cyan-800/60">
              {workspace.case.caseCode}
            </span>
            {workspace.team && (
              <Link
                href={`/teams/${workspace.team.id}`}
                className="font-mono text-xs font-semibold text-purple-400 hover:text-purple-300 px-2.5 py-1 rounded bg-purple-950/60 border border-purple-800/60 flex items-center gap-1.5 transition-colors"
              >
                <Users className="w-3.5 h-3.5 text-purple-400" />
                <span>SQUAD: {workspace.team.name}</span>
              </Link>
            )}
            <span
              className={`font-mono text-[11px] uppercase tracking-wider px-2.5 py-1 rounded border flex items-center gap-1.5 ${statusStyle.bg} ${statusStyle.border} ${statusStyle.text}`}
            >
              {workspace.status === InvestigationStatus.IN_PROGRESS && (
                <Radio className="w-3 h-3 text-cyan-400 animate-pulse" />
              )}
              <span>{statusStyle.label}</span>
            </span>
          </div>

          <div className="flex items-center gap-2 font-mono text-[11px] text-slate-400">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <span>STARTED {new Date(workspace.startedAt).toLocaleDateString()}</span>
          </div>
        </div>

        <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight mb-2 font-sans">
          {workspace.case.title}
        </h1>

        <p className="text-xs md:text-sm text-slate-300 leading-relaxed max-w-3xl mb-6">
          {workspace.case.description}
        </p>

        {/* Tactical Actions Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-[#18233a]">
          <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
            <span>Progress:</span>
            <span className="text-cyan-300 font-semibold">
              {workspace.completedChaptersCount} of {workspace.totalChapters} Acts Completed
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Evidence Vault Quick Access */}
            <Link
              href={`/investigations/${workspace.id}/evidence`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-950/60 hover:bg-cyan-900/60 border border-cyan-500/40 text-cyan-300 text-xs font-mono font-semibold transition-colors"
            >
              <Shield className="w-3.5 h-3.5 text-cyan-400" />
              <span>Evidence Vault</span>
            </Link>

            {/* Cipher Terminal Quick Access */}
            <Link
              href={`/investigations/${workspace.id}/puzzles`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-950/60 hover:bg-amber-900/60 border border-amber-500/40 text-amber-300 text-xs font-mono font-semibold transition-colors"
            >
              <KeyRound className="w-3.5 h-3.5 text-amber-400" />
              <span>Cipher Terminal</span>
            </Link>

            {/* Crime Board Quick Access */}
            <Link
              href={`/investigations/${workspace.id}/board`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-950/60 hover:bg-purple-900/60 border border-purple-500/40 text-purple-300 text-xs font-mono font-semibold transition-colors"
            >
              <Network className="w-3.5 h-3.5 text-purple-400" />
              <span>Crime Board</span>
            </Link>

            {/* Pause Action */}
            {workspace.status === InvestigationStatus.IN_PROGRESS && (
              <button
                type="button"
                onClick={() => handleAction("PAUSE")}
                disabled={transitioning}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#141c2e] hover:bg-[#1b263e] border border-[#23314f] text-slate-300 text-xs font-mono transition-colors disabled:opacity-50"
              >
                <Pause className="w-3.5 h-3.5 text-amber-400" />
                <span>Pause Session</span>
              </button>
            )}

            {/* Resume Action */}
            {workspace.status === InvestigationStatus.PAUSED && (
              <button
                type="button"
                onClick={() => handleAction("RESUME")}
                disabled={transitioning}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-cyan-600/30 hover:bg-cyan-600/40 border border-cyan-500/50 text-cyan-200 text-xs font-mono font-semibold transition-colors disabled:opacity-50"
              >
                <Play className="w-3.5 h-3.5 text-cyan-300" />
                <span>Resume Investigation</span>
              </button>
            )}

            {/* Complete Investigation Action (Active when all chapters done) */}
            {workspace.status === InvestigationStatus.IN_PROGRESS && allChaptersCompleted && (
              <button
                type="button"
                onClick={() => handleAction("COMPLETE")}
                disabled={transitioning}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-emerald-600/30 hover:bg-emerald-600/40 border border-emerald-500/50 text-emerald-200 text-xs font-mono font-semibold transition-colors disabled:opacity-50 animate-pulse"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                <span>Finalize Case</span>
              </button>
            )}

            {/* Abandon Action */}
            {(workspace.status === InvestigationStatus.IN_PROGRESS ||
              workspace.status === InvestigationStatus.PAUSED) && (
              <button
                type="button"
                onClick={() => handleAction("ABANDON")}
                disabled={transitioning}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#14161f] hover:bg-red-950/30 border border-[#232633] hover:border-red-800/40 text-slate-400 hover:text-red-300 text-xs font-mono transition-colors disabled:opacity-50"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Abandon</span>
              </button>
            )}

            {transitioning && <Loader2 className="w-4 h-4 animate-spin text-cyan-400 ml-1" />}
          </div>
        </div>

        {/* Participating Operatives Roster */}
        {workspace.participants && workspace.participants.length > 0 && (
          <div className="mt-4 pt-4 border-t border-[#18233a] flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider mr-1">
              Active Unit Roster ({workspace.participants.length}):
            </span>
            <div className="flex flex-wrap items-center gap-1.5">
              {workspace.participants.map((p) => (
                <span
                  key={p.id}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#101726] border border-[#1e2a44] text-[11px] font-mono text-cyan-300"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
                  <span className="font-semibold">{p.codename}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {error && (
          <div className="mt-3 text-xs font-mono text-rose-400 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>
    </div>
  );
}
