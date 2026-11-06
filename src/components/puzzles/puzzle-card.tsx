"use client";

import React from "react";
import Link from "next/link";
import {
  Lock,
  Unlock,
  CheckCircle2,
  AlertTriangle,
  KeyRound,
  FileCode2,
  Layers,
  ArrowRight,
  ShieldAlert,
} from "lucide-react";
import { CaseDifficulty } from "@prisma/client";
import type { SafePuzzleSummaryDto } from "@/modules/puzzles/types/puzzle.types";

interface PuzzleCardProps {
  investigationId: string;
  puzzle: SafePuzzleSummaryDto;
}

const TYPE_CONFIG: Record<
  string,
  { label: string; icon: React.ComponentType<{ className?: string }> }
> = {
  CAESAR_CIPHER: { label: "Caesar Cipher", icon: KeyRound },
  SUBSTITUTION_CIPHER: { label: "Substitution Cipher", icon: FileCode2 },
  VIGENERE_CIPHER: { label: "Vigenère Cipher", icon: KeyRound },
  HIDDEN_MESSAGE: { label: "Hidden Transmission", icon: FileCode2 },
  LOGIC_CHALLENGE: { label: "Sequence Deduction", icon: Layers },
  ACCESS_CODE: { label: "Security Terminal", icon: KeyRound },
  MULTI_STAGE: { label: "Multi-Stage Defense", icon: Layers },
};

const DIFFICULTY_CONFIG: Record<
  CaseDifficulty,
  { label: string; bg: string; text: string; border: string }
> = {
  EASY: {
    label: "Grade I (Standard)",
    bg: "bg-emerald-950/40",
    text: "text-emerald-400",
    border: "border-emerald-800/40",
  },
  MEDIUM: {
    label: "Grade II (Restricted)",
    bg: "bg-amber-950/40",
    text: "text-amber-400",
    border: "border-amber-800/40",
  },
  HARD: {
    label: "Grade III (Classified)",
    bg: "bg-rose-950/40",
    text: "text-rose-400",
    border: "border-rose-800/40",
  },
  EXPERT: {
    label: "Grade IV (Top Secret)",
    bg: "bg-purple-950/40",
    text: "text-purple-400",
    border: "border-purple-800/40",
  },
};

export function PuzzleCard({ investigationId, puzzle }: PuzzleCardProps) {
  const typeMeta = TYPE_CONFIG[puzzle.puzzleType] || { label: puzzle.puzzleType, icon: KeyRound };
  const TypeIcon = typeMeta.icon;
  const diffMeta = DIFFICULTY_CONFIG[puzzle.difficulty] || DIFFICULTY_CONFIG.MEDIUM;

  const isLocked = puzzle.isLocked || puzzle.progressStatus === "LOCKED";
  const isSolved = puzzle.progressStatus === "SOLVED";
  const isFailed = puzzle.progressStatus === "FAILED";

  const cardContent = (
    <div
      className={`rounded-xl border p-5 transition-all relative flex flex-col justify-between h-full ${
        isLocked
          ? "bg-[#0a0f1b]/60 border-[#151f33] opacity-65"
          : isSolved
            ? "bg-[#0b1622]/90 border-emerald-600/40 shadow-sm shadow-emerald-950/20"
            : isFailed
              ? "bg-[#180e14]/90 border-rose-900/40"
              : "bg-[#0d1424] border-[#1e2a42] hover:border-cyan-500/50 hover:bg-[#10192e] shadow-md shadow-cyan-950/10"
      }`}
    >
      <div>
        {/* Header Tags */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-[#141d30] border border-[#22314e] text-cyan-300">
              <TypeIcon className="w-3 h-3 text-cyan-400" />
              <span>{typeMeta.label}</span>
            </span>

            <span
              className={`text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded border ${diffMeta.bg} ${diffMeta.border} ${diffMeta.text}`}
            >
              {diffMeta.label}
            </span>

            {puzzle.isMultiStage && (
              <span className="text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded bg-purple-950/50 border border-purple-800/50 text-purple-300">
                {puzzle.stageCount} Stages
              </span>
            )}
          </div>

          {/* Status Indicator Badge */}
          <div>
            {isSolved ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/70 border border-emerald-600/60 text-emerald-300">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                <span>SOLVED</span>
              </span>
            ) : isFailed ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded bg-rose-950/70 border border-rose-700/60 text-rose-300">
                <AlertTriangle className="w-3 h-3 text-rose-400" />
                <span>LOCKED OUT</span>
              </span>
            ) : isLocked ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900/80 border border-slate-700/60 text-slate-400">
                <Lock className="w-3 h-3 text-slate-500" />
                <span>ACT LOCKED</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950/70 border border-cyan-600/60 text-cyan-300 animate-pulse">
                <Unlock className="w-3 h-3 text-cyan-400" />
                <span>ACTIVE</span>
              </span>
            )}
          </div>
        </div>

        {/* Title & Description */}
        <h3 className="text-base font-semibold text-white font-sans mb-1.5 group-hover:text-cyan-200 transition-colors">
          {puzzle.title}
        </h3>
        <p className="text-xs text-slate-400 leading-relaxed line-clamp-2 mb-4">
          {puzzle.description}
        </p>

        {puzzle.chapterTitle && (
          <div className="text-[10px] font-mono text-slate-500 mb-3">
            Assigned: <span className="text-slate-300">{puzzle.chapterTitle}</span>
          </div>
        )}
      </div>

      {/* Footer Info & Action */}
      <div className="pt-3 border-t border-[#18233a] flex items-center justify-between text-xs font-mono">
        <div className="text-[11px] text-slate-400">
          {puzzle.maxAttempts ? (
            <span>
              Attempts:{" "}
              <span className="text-slate-200">
                {puzzle.myAttemptsCount} / {puzzle.maxAttempts}
              </span>
            </span>
          ) : (
            <span className="text-slate-500">Unlimited Attempts</span>
          )}
        </div>

        <div>
          {isLocked ? (
            <span className="text-[11px] text-slate-500 flex items-center gap-1">
              <Lock className="w-3 h-3" /> Locked
            </span>
          ) : (
            <span className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-semibold group-hover:translate-x-0.5 transition-transform">
              <span>{isSolved ? "Review Chambers" : "Access Console"}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </span>
          )}
        </div>
      </div>
    </div>
  );

  if (isLocked) {
    return <div className="block">{cardContent}</div>;
  }

  return (
    <Link
      href={`/investigations/${investigationId}/puzzles/${puzzle.id}`}
      className="group block h-full focus:outline-none focus:ring-2 focus:ring-cyan-500/50 rounded-xl"
    >
      {cardContent}
    </Link>
  );
}
