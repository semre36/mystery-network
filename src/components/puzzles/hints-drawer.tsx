"use client";

import React, { useState } from "react";
import {
  HelpCircle,
  Lock,
  Unlock,
  ChevronDown,
  ChevronUp,
  Loader2,
  AlertCircle,
  Lightbulb,
} from "lucide-react";
import type { SafePuzzleHintDto } from "@/modules/puzzles/types/puzzle.types";

interface HintsDrawerProps {
  investigationId: string;
  puzzleId: string;
  hints: SafePuzzleHintDto[];
  myAttemptsCount: number;
  onHintUnlocked?: (hintId: string) => void;
}

export function HintsDrawer({
  investigationId,
  puzzleId,
  hints,
  myAttemptsCount,
  onHintUnlocked,
}: HintsDrawerProps) {
  const [open, setOpen] = useState<boolean>(true);
  const [unlockingId, setUnlockingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!hints || hints.length === 0) {
    return null;
  }

  const handleUnlock = async (hintId: string) => {
    try {
      setUnlockingId(hintId);
      setError(null);

      const res = await fetch(
        `/api/investigations/${investigationId}/puzzles/${puzzleId}/hints/${hintId}/unlock`,
        {
          method: "POST",
        }
      );

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to unlock tactical hint.");
      }

      if (onHintUnlocked) {
        onHintUnlocked(hintId);
      }
    } catch (err: any) {
      setError(err.message || "Failed to unlock hint intelligence.");
    } finally {
      setUnlockingId(null);
    }
  };

  const unlockedCount = hints.filter((h) => h.isUnlocked).length;

  return (
    <div className="rounded-xl bg-[#090f1d] border border-[#1b2742] overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full px-4 py-3 bg-[#0d1527] hover:bg-[#121c33] flex items-center justify-between border-b border-[#1b2742] transition-colors"
      >
        <div className="flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-semibold text-slate-200 uppercase tracking-wider font-mono">
            Tactical Hints & Intelligence ({unlockedCount}/{hints.length})
          </span>
        </div>
        {open ? (
          <ChevronUp className="w-4 h-4 text-slate-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-400" />
        )}
      </button>

      {open && (
        <div className="p-4 space-y-3">
          {error && (
            <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-800/50 text-rose-300 text-xs font-mono flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {hints.map((hint) => {
            const minAttempts = hint.unlockConditions?.minAttempts || 0;
            const canUnlock = myAttemptsCount >= minAttempts;

            return (
              <div
                key={hint.id}
                className={`rounded-lg border p-3.5 space-y-2 transition-all ${
                  hint.isUnlocked
                    ? "bg-[#0b1625] border-amber-500/40"
                    : "bg-[#070b14] border-[#151f33]"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {hint.isUnlocked ? (
                      <Unlock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    ) : (
                      <Lock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    )}
                    <h5 className="text-xs font-semibold text-slate-200 font-sans">
                      {hint.title || `Hint #${hint.hintOrder}`}
                    </h5>
                  </div>

                  {hint.isUnlocked ? (
                    <span className="text-[10px] font-mono text-amber-400 uppercase tracking-wider px-2 py-0.5 rounded bg-amber-950/60 border border-amber-800/50">
                      Disclosed
                    </span>
                  ) : canUnlock ? (
                    <button
                      type="button"
                      onClick={() => handleUnlock(hint.id)}
                      disabled={unlockingId === hint.id}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-950/70 hover:bg-amber-900/70 border border-amber-600/50 text-amber-300 text-[11px] font-mono transition-colors disabled:opacity-50"
                    >
                      {unlockingId === hint.id ? (
                        <>
                          <Loader2 className="w-3 h-3 animate-spin" />
                          <span>Decrypting...</span>
                        </>
                      ) : (
                        <span>Decrypt Hint</span>
                      )}
                    </button>
                  ) : (
                    <span className="text-[10px] font-mono text-slate-500 bg-[#101726] px-2 py-0.5 rounded border border-[#1b263d]">
                      Requires {minAttempts} attempt{minAttempts > 1 ? "s" : ""} (Current:{" "}
                      {myAttemptsCount})
                    </span>
                  )}
                </div>

                {hint.isUnlocked ? (
                  <p className="text-xs text-amber-200/90 leading-relaxed font-mono bg-[#050a14] p-2.5 rounded border border-[#14233c]">
                    {hint.content}
                  </p>
                ) : (
                  <p className="text-[11px] text-slate-500 italic">
                    Classified intelligence memorandum. Fulfill attempt threshold to declassify.
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
