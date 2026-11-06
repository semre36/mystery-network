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

export function WorkspaceHeader({ workspace }: WorkspaceHeaderProps) {
  const router = useRouter();
  const [transitioning, setTransitioning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const statusStyle = STATUS_CONFIG[workspace.status] ?? STATUS_CONFIG.IN_PROGRESS;
  const allChaptersCompleted =
    workspace.totalChapters > 0 && workspace.completedChaptersCount === workspace.totalChapters;

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
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-semibold text-cyan-400 px-2.5 py-1 rounded bg-cyan-950/60 border border-cyan-800/60">
              {workspace.case.caseCode}
            </span>
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
