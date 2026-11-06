"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ChevronLeft,
  KeyRound,
  ShieldAlert,
  CheckCircle2,
  Lock,
  Layers,
  RefreshCw,
  Loader2,
  AlertCircle,
} from "lucide-react";
import type { SafePuzzleSummaryDto } from "@/modules/puzzles/types/puzzle.types";
import { PuzzleCard } from "@/components/puzzles/puzzle-card";

export default function PuzzlesDirectoryPage() {
  const params = useParams();
  const investigationId = params.investigationId as string;

  const [puzzles, setPuzzles] = useState<SafePuzzleSummaryDto[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "SOLVED" | "LOCKED">("ALL");

  const fetchPuzzles = useCallback(async () => {
    if (!investigationId) return;

    try {
      setLoading(true);
      setError(null);

      const res = await fetch(`/api/investigations/${investigationId}/puzzles`);
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || "Failed to load investigation challenges.");
      }

      setPuzzles(json.data.puzzles || []);
    } catch (err: any) {
      setError(err.message || "Failed to retrieve cryptographic challenges.");
    } finally {
      setLoading(false);
    }
  }, [investigationId]);

  useEffect(() => {
    let isCancelled = false;

    fetch(`/api/investigations/${investigationId}/puzzles`)
      .then(async (res) => {
        if (!res.ok) {
          const json = await res.json();
          throw new Error(json.error || "Failed to load investigation challenges.");
        }
        return res.json();
      })
      .then((json) => {
        if (!isCancelled) {
          setPuzzles(json.data.puzzles || []);
          setLoading(false);
        }
      })
      .catch((err: any) => {
        if (!isCancelled) {
          setError(err.message || "Failed to retrieve cryptographic challenges.");
          setLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [investigationId]);

  const solvedCount = puzzles.filter((p) => p.progressStatus === "SOLVED").length;
  const activeCount = puzzles.filter(
    (p) => !p.isLocked && (p.progressStatus === "UNLOCKED" || p.progressStatus === "IN_PROGRESS")
  ).length;
  const lockedCount = puzzles.filter((p) => p.isLocked || p.progressStatus === "LOCKED").length;

  const filteredPuzzles = puzzles.filter((p) => {
    if (statusFilter === "ALL") return true;
    if (statusFilter === "SOLVED") return p.progressStatus === "SOLVED";
    if (statusFilter === "ACTIVE")
      return !p.isLocked && (p.progressStatus === "UNLOCKED" || p.progressStatus === "IN_PROGRESS");
    if (statusFilter === "LOCKED") return p.isLocked || p.progressStatus === "LOCKED";
    return true;
  });

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Navigation Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#18233a]">
        <div className="space-y-1">
          <Link
            href={`/investigations/${investigationId}`}
            className="inline-flex items-center gap-1.5 text-xs font-mono text-cyan-400 hover:text-cyan-300 transition-colors mb-2"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>Return to Workspace</span>
          </Link>

          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-cyan-950/60 border border-cyan-500/40 text-cyan-400">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight font-sans">
                Cipher Terminal & Challenges
              </h1>
              <p className="text-xs text-slate-400">
                Cryptographic algorithms, security locks, and forensic deduction gates.
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => fetchPuzzles()}
          disabled={loading}
          className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#101726] hover:bg-[#162136] border border-[#1e2c47] text-slate-300 text-xs font-mono transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Sync Status</span>
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
        <div className="rounded-xl bg-[#0d1424] border border-[#1e2a42] p-3.5 space-y-1">
          <span className="text-[10px] text-slate-500 uppercase tracking-wider block">
            Total Obstacles
          </span>
          <span className="text-lg font-bold text-white">{puzzles.length}</span>
        </div>

        <div className="rounded-xl bg-[#09151e] border border-cyan-900/40 p-3.5 space-y-1">
          <span className="text-[10px] text-cyan-500 uppercase tracking-wider block">
            Active Chambers
          </span>
          <span className="text-lg font-bold text-cyan-300">{activeCount}</span>
        </div>

        <div className="rounded-xl bg-[#081815] border border-emerald-900/40 p-3.5 space-y-1">
          <span className="text-[10px] text-emerald-500 uppercase tracking-wider block">
            Solved by Squad
          </span>
          <span className="text-lg font-bold text-emerald-300">{solvedCount}</span>
        </div>

        <div className="rounded-xl bg-[#11141e] border border-slate-800 p-3.5 space-y-1">
          <span className="text-[10px] text-slate-500 uppercase tracking-wider block">
            Act Locked
          </span>
          <span className="text-lg font-bold text-slate-400">{lockedCount}</span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-[#18233a] pb-2 text-xs font-mono">
        <button
          type="button"
          onClick={() => setStatusFilter("ALL")}
          className={`px-3 py-1.5 rounded-lg transition-colors ${
            statusFilter === "ALL"
              ? "bg-cyan-950/70 text-cyan-300 border border-cyan-500/50"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          All ({puzzles.length})
        </button>
        <button
          type="button"
          onClick={() => setStatusFilter("ACTIVE")}
          className={`px-3 py-1.5 rounded-lg transition-colors ${
            statusFilter === "ACTIVE"
              ? "bg-cyan-950/70 text-cyan-300 border border-cyan-500/50"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          Active ({activeCount})
        </button>
        <button
          type="button"
          onClick={() => setStatusFilter("SOLVED")}
          className={`px-3 py-1.5 rounded-lg transition-colors ${
            statusFilter === "SOLVED"
              ? "bg-cyan-950/70 text-cyan-300 border border-cyan-500/50"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          Solved ({solvedCount})
        </button>
        <button
          type="button"
          onClick={() => setStatusFilter("LOCKED")}
          className={`px-3 py-1.5 rounded-lg transition-colors ${
            statusFilter === "LOCKED"
              ? "bg-cyan-950/70 text-cyan-300 border border-cyan-500/50"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          Locked ({lockedCount})
        </button>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs font-mono flex items-center gap-2.5">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="py-16 flex flex-col items-center justify-center space-y-3 text-slate-400 font-mono text-xs">
          <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
          <span>Decrypting challenge index...</span>
        </div>
      )}

      {/* Grid of Puzzles */}
      {!loading && filteredPuzzles.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredPuzzles.map((p) => (
            <PuzzleCard key={p.id} investigationId={investigationId} puzzle={p} />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredPuzzles.length === 0 && (
        <div className="rounded-xl bg-[#0c1220] border border-[#1b2742] p-12 text-center space-y-2 font-mono">
          <ShieldAlert className="w-8 h-8 text-slate-500 mx-auto" />
          <h3 className="text-sm font-semibold text-slate-300 font-sans">
            No Challenges Matching Filter
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Progress further through case acts to encounter additional cryptographic obstacles.
          </p>
        </div>
      )}
    </div>
  );
}
