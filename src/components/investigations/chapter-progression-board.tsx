"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  FileText,
  Lock,
  Unlock,
  CheckCircle2,
  Play,
  Check,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { ChapterProgressStatus, InvestigationStatus } from "@prisma/client";
import type { SafeInvestigationChapterProgressDto } from "@/modules/investigations/types/investigation.types";

interface ChapterProgressionBoardProps {
  investigationId: string;
  investigationStatus: InvestigationStatus;
  chapters: SafeInvestigationChapterProgressDto[];
}

export function ChapterProgressionBoard({
  investigationId,
  investigationStatus,
  chapters,
}: ChapterProgressionBoardProps) {
  const router = useRouter();
  const [processingChapterId, setProcessingChapterId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isInvestigationActive = investigationStatus === InvestigationStatus.IN_PROGRESS;

  const handleProgress = async (
    chapterId: string,
    action: "START_CHAPTER" | "COMPLETE_CHAPTER"
  ) => {
    if (!isInvestigationActive) return;

    setProcessingChapterId(chapterId);
    setError(null);

    try {
      const res = await fetch(`/api/investigations/${investigationId}/progress`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chapterId, action }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to update progression");
      }

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error updating chapter progress");
    } finally {
      setProcessingChapterId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-[#182236]">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-cyan-400" />
          <h2 className="text-base font-semibold text-white font-sans">
            Tactical Investigation Acts ({chapters.length})
          </h2>
        </div>
        <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">
          Active Progression Path
        </span>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-800/50 text-xs font-mono text-rose-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="space-y-3">
        {chapters.map((chapter) => {
          const isProcessing = processingChapterId === chapter.chapterId;

          return (
            <div
              key={chapter.chapterId}
              className={`rounded-xl border p-4 transition-all ${
                chapter.status === ChapterProgressStatus.COMPLETED
                  ? "bg-[#0b1322] border-emerald-900/40 text-slate-300"
                  : chapter.status === ChapterProgressStatus.IN_PROGRESS
                    ? "bg-[#0d1629] border-cyan-500/50 text-slate-200 shadow-[0_0_20px_rgba(6,182,212,0.08)]"
                    : chapter.status === ChapterProgressStatus.UNLOCKED
                      ? "bg-[#0d1424] border-[#1e2a42] text-slate-300"
                      : "bg-[#090e1a] border-[#141d30] text-slate-500 opacity-70"
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
                <div className="flex items-center gap-2.5">
                  <span
                    className={`font-mono text-xs px-2 py-0.5 rounded font-semibold ${
                      chapter.status === ChapterProgressStatus.COMPLETED
                        ? "bg-emerald-950/60 border border-emerald-800/60 text-emerald-400"
                        : chapter.status === ChapterProgressStatus.IN_PROGRESS
                          ? "bg-cyan-950/60 border border-cyan-800/60 text-cyan-300"
                          : "bg-[#131b2e] border border-[#212d47] text-slate-400"
                    }`}
                  >
                    Act {chapter.chapterOrder}
                  </span>
                  <h4 className="text-sm font-semibold text-slate-100 font-sans">
                    {chapter.title}
                  </h4>
                </div>

                {/* Status Badges */}
                <div className="flex items-center gap-2">
                  {chapter.status === ChapterProgressStatus.COMPLETED && (
                    <span className="flex items-center gap-1.5 text-[11px] font-mono text-emerald-400 px-2 py-0.5 rounded bg-emerald-950/40 border border-emerald-800/50">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Concluded</span>
                      {chapter.completedAt && (
                        <span className="text-[10px] text-slate-500 hidden md:inline">
                          ({new Date(chapter.completedAt).toLocaleTimeString()})
                        </span>
                      )}
                    </span>
                  )}

                  {chapter.status === ChapterProgressStatus.IN_PROGRESS && (
                    <span className="flex items-center gap-1.5 text-[11px] font-mono text-cyan-300 px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-500/50 animate-pulse">
                      <Play className="w-3 h-3 text-cyan-400" />
                      <span>Actively In Progress</span>
                    </span>
                  )}

                  {chapter.status === ChapterProgressStatus.UNLOCKED && (
                    <span className="flex items-center gap-1.5 text-[11px] font-mono text-amber-300 px-2 py-0.5 rounded bg-amber-950/40 border border-amber-800/50">
                      <Unlock className="w-3 h-3 text-amber-400" />
                      <span>Ready to Deploy</span>
                    </span>
                  )}

                  {chapter.status === ChapterProgressStatus.LOCKED && (
                    <span className="flex items-center gap-1.5 text-[11px] font-mono text-slate-500 px-2 py-0.5 rounded bg-[#0d1320] border border-[#162033]">
                      <Lock className="w-3 h-3 text-slate-600" />
                      <span>Awaiting Prior Act</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Description */}
              <p className="text-xs text-slate-400 leading-relaxed mb-3">{chapter.description}</p>

              {/* Action Buttons for Operative */}
              {isInvestigationActive && (
                <div className="pt-2 flex items-center justify-end gap-2 border-t border-[#162033]">
                  {chapter.status === ChapterProgressStatus.UNLOCKED && (
                    <button
                      type="button"
                      onClick={() => handleProgress(chapter.chapterId, "START_CHAPTER")}
                      disabled={isProcessing}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600/30 hover:bg-cyan-600/40 border border-cyan-500/50 text-cyan-200 text-xs font-mono font-semibold transition-colors disabled:opacity-50"
                    >
                      {isProcessing ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Play className="w-3.5 h-3.5" />
                      )}
                      <span>ENTER THIS ACT</span>
                    </button>
                  )}

                  {chapter.status === ChapterProgressStatus.IN_PROGRESS && (
                    <button
                      type="button"
                      onClick={() => handleProgress(chapter.chapterId, "COMPLETE_CHAPTER")}
                      disabled={isProcessing}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600/30 hover:bg-emerald-600/40 border border-emerald-500/50 text-emerald-200 text-xs font-mono font-semibold transition-colors disabled:opacity-50"
                    >
                      {isProcessing ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Check className="w-3.5 h-3.5" />
                      )}
                      <span>CONCLUDE ACT</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
