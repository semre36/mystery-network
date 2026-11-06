"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ChevronLeft,
  KeyRound,
  Lock,
  Unlock,
  CheckCircle2,
  AlertTriangle,
  Send,
  Loader2,
  Layers,
  HelpCircle,
  Clock,
  History,
  FileCode2,
  ShieldAlert,
} from "lucide-react";
import type {
  SafePuzzleDetailDto,
  SafePuzzleAttemptDto,
  SafePuzzleStageDto,
} from "@/modules/puzzles/types/puzzle.types";
import { CipherScratchpad } from "@/components/puzzles/cipher-scratchpad";
import { LogicOrderingScratchpad } from "@/components/puzzles/logic-ordering-scratchpad";
import { HintsDrawer } from "@/components/puzzles/hints-drawer";

export default function PuzzleChamberPage() {
  const params = useParams();
  const router = useRouter();
  const investigationId = params.investigationId as string;
  const puzzleId = params.puzzleId as string;

  const [puzzle, setPuzzle] = useState<SafePuzzleDetailDto | null>(null);
  const [attempts, setAttempts] = useState<SafePuzzleAttemptDto[]>([]);
  const [selectedStageId, setSelectedStageId] = useState<string | null>(null);

  const [answerInput, setAnswerInput] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [feedback, setFeedback] = useState<{
    type: "SUCCESS" | "ERROR" | "WARNING";
    message: string;
  } | null>(null);

  // Fetch puzzle details
  const fetchPuzzle = useCallback(async () => {
    if (!investigationId || !puzzleId) return;

    try {
      setLoading(true);
      const res = await fetch(`/api/investigations/${investigationId}/puzzles/${puzzleId}`);
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || "Failed to load challenge console.");
      }

      setPuzzle(json.data);

      // Auto-select current active stage if multi-stage
      if (json.data.isMultiStage && json.data.stages && json.data.stages.length > 0) {
        const activeStage =
          json.data.stages.find((s: SafePuzzleStageDto) => !s.isLocked && !s.isCompleted) ||
          json.data.stages[0];
        setSelectedStageId(activeStage.id);
      }
    } catch (err: any) {
      setFeedback({
        type: "ERROR",
        message: err.message || "Failed to load challenge chamber.",
      });
    } finally {
      setLoading(false);
    }
  }, [investigationId, puzzleId]);

  // Fetch attempts history
  const fetchAttempts = useCallback(async () => {
    if (!investigationId || !puzzleId) return;

    try {
      const res = await fetch(
        `/api/investigations/${investigationId}/puzzles/${puzzleId}/attempts`
      );
      const json = await res.json();
      if (res.ok) {
        setAttempts(json.data.attempts || []);
      }
    } catch {
      // Non-blocking
    }
  }, [investigationId, puzzleId]);

  useEffect(() => {
    let isCancelled = false;

    // Load puzzle detail
    fetch(`/api/investigations/${investigationId}/puzzles/${puzzleId}`)
      .then(async (res) => {
        if (!res.ok) {
          const json = await res.json();
          throw new Error(json.error || "Failed to load challenge console.");
        }
        return res.json();
      })
      .then((json) => {
        if (!isCancelled) {
          setPuzzle(json.data);
          if (json.data.isMultiStage && json.data.stages && json.data.stages.length > 0) {
            const activeStage =
              json.data.stages.find((s: SafePuzzleStageDto) => !s.isLocked && !s.isCompleted) ||
              json.data.stages[0];
            setSelectedStageId(activeStage.id);
          }
          setLoading(false);
        }
      })
      .catch((err: any) => {
        if (!isCancelled) {
          setFeedback({
            type: "ERROR",
            message: err.message || "Failed to load challenge chamber.",
          });
          setLoading(false);
        }
      });

    // Load attempt history
    fetch(`/api/investigations/${investigationId}/puzzles/${puzzleId}/attempts`)
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (!isCancelled && json?.data?.attempts) {
          setAttempts(json.data.attempts);
        }
      })
      .catch(() => {
        // Non-blocking
      });

    return () => {
      isCancelled = true;
    };
  }, [investigationId, puzzleId]);

  // Active stage object
  const currentStage =
    puzzle?.isMultiStage && selectedStageId
      ? puzzle.stages?.find((s) => s.id === selectedStageId)
      : null;

  const activeType = currentStage ? currentStage.puzzleType : puzzle?.puzzleType;
  const activePublicConfig = currentStage
    ? currentStage.publicConfiguration
    : puzzle?.publicConfiguration;

  const isSolved = puzzle?.progressStatus === "SOLVED";
  const isFailed = puzzle?.progressStatus === "FAILED";
  const myAttemptsCount = puzzle?.myAttemptsCount || 0;
  const maxAttempts = currentStage?.maxAttempts ?? puzzle?.maxAttempts ?? 5;
  const attemptsRemaining = maxAttempts ? Math.max(0, maxAttempts - myAttemptsCount) : null;

  // Submit attempt
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!answerInput.trim() || submitting || isSolved) return;

    try {
      setSubmitting(true);
      setFeedback(null);

      const endpoint =
        puzzle?.isMultiStage && selectedStageId
          ? `/api/investigations/${investigationId}/puzzles/${puzzleId}/stages/${selectedStageId}/attempts`
          : `/api/investigations/${investigationId}/puzzles/${puzzleId}/attempts`;

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answer: answerInput.trim() }),
      });

      const json = await res.json();

      if (!res.ok) {
        setFeedback({
          type: "ERROR",
          message: json.error || "Submission failed. Please verify and retry.",
        });
        await fetchPuzzle();
        await fetchAttempts();
        return;
      }

      if (json.data.isCorrect) {
        setFeedback({
          type: "SUCCESS",
          message:
            json.data.message ||
            (puzzle?.isMultiStage
              ? "Stage authorization confirmed! Proceeding to next gateway."
              : "Cryptographic cipher broken! Challenge resolved successfully."),
        });
        setAnswerInput("");
        await fetchPuzzle();
        await fetchAttempts();
      } else {
        setFeedback({
          type: "WARNING",
          message:
            json.data.message ||
            `Authorization rejected. Incorrect answer. (${json.data.remainingAttempts ?? 0} attempts left)`,
        });
        await fetchPuzzle();
        await fetchAttempts();
      }
    } catch (err: any) {
      setFeedback({
        type: "ERROR",
        message: err.message || "Network error during validation dispatch.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center space-y-3 font-mono text-xs text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
        <span>Establishing encrypted link to console chamber...</span>
      </div>
    );
  }

  if (!puzzle) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center space-y-4">
        <ShieldAlert className="w-10 h-10 text-rose-500 mx-auto" />
        <h2 className="text-base font-semibold text-white">Challenge Unavailable</h2>
        <p className="text-xs text-slate-400">
          The requested puzzle console could not be retrieved. It may be locked or restricted.
        </p>
        <Link
          href={`/investigations/${investigationId}/puzzles`}
          className="inline-flex items-center gap-2 text-xs font-mono text-cyan-400 hover:underline"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Back to Challenge Terminal</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16">
      {/* Top Navigation */}
      <div className="flex items-center justify-between gap-4 pb-3 border-b border-[#18233a]">
        <Link
          href={`/investigations/${investigationId}/puzzles`}
          className="inline-flex items-center gap-1.5 text-xs font-mono text-cyan-400 hover:text-cyan-300 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>All Challenges</span>
        </Link>

        <div className="flex items-center gap-2 font-mono text-xs">
          {isSolved ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-emerald-950/70 border border-emerald-600/60 text-emerald-300 font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>CHALLENGE SOLVED</span>
            </span>
          ) : isFailed ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-rose-950/70 border border-rose-700/60 text-rose-300 font-semibold">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
              <span>LOCKOUT ENFORCED</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-cyan-950/70 border border-cyan-500/50 text-cyan-300 font-semibold">
              <Unlock className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
              <span>CONSOLE ENGAGED</span>
            </span>
          )}
        </div>
      </div>

      {/* Main Challenge Header */}
      <div className="rounded-xl bg-[#0d1424] border border-[#1e2a42] p-6 space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-800/50 text-cyan-300">
            {puzzle.puzzleType}
          </span>
          <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-amber-950/50 border border-amber-800/50 text-amber-300">
            {puzzle.difficulty}
          </span>
          {puzzle.chapterTitle && (
            <span className="text-[10px] font-mono text-slate-400">Act: {puzzle.chapterTitle}</span>
          )}
        </div>

        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight font-sans mb-2">
            {puzzle.title}
          </h1>
          <p className="text-sm text-slate-300 leading-relaxed">{puzzle.description}</p>
        </div>

        {puzzle.instructions && (
          <div className="p-3.5 rounded-lg bg-[#080d18] border border-[#17233c] text-xs font-mono text-cyan-200/90 leading-relaxed">
            <span className="text-cyan-400 font-bold block mb-1">TACTICAL BRIEFING:</span>
            {puzzle.instructions}
          </div>
        )}
      </div>

      {/* Multi-Stage Stepper Navigation */}
      {puzzle.isMultiStage && puzzle.stages && puzzle.stages.length > 0 && (
        <div className="rounded-xl bg-[#090f1d] border border-[#1b2742] p-4 space-y-3">
          <div className="text-xs font-mono uppercase tracking-wider text-slate-400 flex items-center justify-between">
            <span>Multi-Stage Defense Steps</span>
            <span className="text-purple-400">
              {puzzle.stages.filter((s) => s.isCompleted).length} of {puzzle.stages.length} Solved
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {puzzle.stages.map((stg) => {
              const isSelected = selectedStageId === stg.id;
              const isUnlocked = !stg.isLocked;
              return (
                <button
                  key={stg.id}
                  type="button"
                  onClick={() => isUnlocked && setSelectedStageId(stg.id)}
                  disabled={!isUnlocked}
                  className={`p-3 rounded-lg border text-left transition-all font-mono text-xs flex items-center justify-between gap-2 ${
                    isSelected
                      ? "bg-purple-950/60 border-purple-500 text-purple-200"
                      : stg.isCompleted
                        ? "bg-emerald-950/40 border-emerald-700/50 text-emerald-300"
                        : isUnlocked
                          ? "bg-[#0f172a] border-[#223252] text-slate-300 hover:border-cyan-500"
                          : "bg-[#060a12] border-[#121a29] text-slate-600 opacity-60 cursor-not-allowed"
                  }`}
                >
                  <div className="min-w-0">
                    <span className="text-[10px] text-slate-400 block">Stage {stg.stageOrder}</span>
                    <span className="font-semibold truncate block">{stg.title}</span>
                  </div>

                  {stg.isCompleted ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : isUnlocked ? (
                    <Unlock className="w-4 h-4 text-purple-400 shrink-0" />
                  ) : (
                    <Lock className="w-4 h-4 text-slate-600 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>

          {currentStage && (
            <div className="p-3 rounded bg-[#060a14] border border-[#162238] text-xs font-mono text-slate-300">
              <span className="text-purple-300 font-bold">CURRENT STAGE OBJECTIVE: </span>
              {currentStage.instructions}
            </div>
          )}
        </div>
      )}

      {/* Public Configuration / Encrypted Prompt Card */}
      {activePublicConfig && (
        <div className="rounded-xl bg-[#090f1d] border border-[#1b2742] p-5 space-y-3 font-mono">
          <div className="flex items-center justify-between pb-2 border-b border-[#162137]">
            <span className="text-xs uppercase tracking-wider text-slate-400">
              Recovered Payload / Intercept
            </span>
            <span className="text-[10px] text-cyan-400">CLASS: UNENCRYPTED_HEADER</span>
          </div>

          {activePublicConfig.ciphertext && (
            <div className="space-y-1">
              <div className="text-[10px] text-slate-500 uppercase">Raw Ciphertext</div>
              <div className="p-3 rounded-lg bg-[#050912] border border-[#1b253b] text-base font-bold text-cyan-300 tracking-widest break-all">
                {activePublicConfig.ciphertext}
              </div>
            </div>
          )}

          {activePublicConfig.prompt && (
            <div className="text-xs text-slate-300 leading-relaxed">
              <span className="text-slate-500 block text-[10px] uppercase">Challenge Prompt</span>
              {activePublicConfig.prompt}
            </div>
          )}

          {activePublicConfig.shiftHint && (
            <div className="text-xs text-cyan-300/80">
              <span className="text-slate-500 block text-[10px] uppercase">Telemetry Hint</span>
              {activePublicConfig.shiftHint}
            </div>
          )}

          {activePublicConfig.keywordHint && (
            <div className="text-xs text-amber-300/80">
              <span className="text-slate-500 block text-[10px] uppercase">Intelligence Note</span>
              {activePublicConfig.keywordHint}
            </div>
          )}

          {activePublicConfig.clues && Array.isArray(activePublicConfig.clues) && (
            <div className="space-y-1.5 pt-1">
              <div className="text-[10px] text-slate-500 uppercase">Telemetry Clues</div>
              <ul className="space-y-1 text-xs text-slate-300 list-disc list-inside">
                {activePublicConfig.clues.map((clue: string, idx: number) => (
                  <li key={idx} className="leading-relaxed">
                    {clue}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Interactive Cryptanalysis Scratchpad */}
      {activeType && (
        <CipherScratchpad
          puzzleType={activeType}
          ciphertext={activePublicConfig?.ciphertext}
          onApplyToAnswer={(res) => setAnswerInput(res)}
        />
      )}

      {/* Sequence Ordering Deduction Scratchpad */}
      {activeType === "LOGIC_CHALLENGE" && activePublicConfig?.items && (
        <LogicOrderingScratchpad
          items={activePublicConfig.items}
          onApplyToAnswer={(seq) => setAnswerInput(seq)}
        />
      )}

      {/* Solution Submission Form */}
      <div className="rounded-xl bg-[#0d1424] border border-[#1e2a42] p-5 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-[#18233a]">
          <div className="flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-cyan-400" />
            <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider font-mono">
              Solution Dispatch Console
            </h3>
          </div>
          {attemptsRemaining !== null && (
            <span
              className={`text-[11px] font-mono px-2 py-0.5 rounded border ${
                attemptsRemaining <= 1
                  ? "bg-rose-950/60 border-rose-800 text-rose-300 font-bold"
                  : "bg-[#141d30] border-[#22314e] text-slate-400"
              }`}
            >
              Attempts Remaining: {attemptsRemaining} / {maxAttempts}
            </span>
          )}
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`p-3.5 rounded-lg border text-xs font-mono flex items-start gap-2.5 ${
              feedback.type === "SUCCESS"
                ? "bg-emerald-950/40 border-emerald-600/50 text-emerald-300"
                : feedback.type === "WARNING"
                  ? "bg-amber-950/40 border-amber-600/50 text-amber-300"
                  : "bg-rose-950/40 border-rose-700/50 text-rose-300"
            }`}
          >
            {feedback.type === "SUCCESS" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            )}
            <div className="leading-relaxed">{feedback.message}</div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-xs font-mono text-slate-300 block">
              Enter Decoded Answer / Passcode:
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={answerInput}
                onChange={(e) => setAnswerInput(e.target.value)}
                disabled={submitting || isSolved || isFailed}
                placeholder={
                  isSolved
                    ? "Chamber resolved"
                    : isFailed
                      ? "Chamber locked out"
                      : "Type proposed solution..."
                }
                className="flex-1 px-4 py-2.5 rounded-lg bg-[#080d18] border border-[#23314f] text-white font-mono text-sm focus:outline-none focus:border-cyan-500 disabled:opacity-50"
              />

              <button
                type="submit"
                disabled={submitting || !answerInput.trim() || isSolved || isFailed}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/50 text-cyan-300 text-xs font-mono font-semibold transition-colors disabled:opacity-50 shrink-0"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
                    <span>Verifying...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 text-cyan-400" />
                    <span>Dispatch</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Progressive Tactical Hints Drawer */}
      {puzzle.hints && puzzle.hints.length > 0 && (
        <HintsDrawer
          investigationId={investigationId}
          puzzleId={puzzle.id}
          hints={puzzle.hints}
          myAttemptsCount={myAttemptsCount}
          onHintUnlocked={() => fetchPuzzle()}
        />
      )}

      {/* Attempt History Log */}
      {attempts.length > 0 && (
        <div className="rounded-xl bg-[#090f1d] border border-[#1b2742] p-4 space-y-3 font-mono">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-slate-400 pb-2 border-b border-[#162137]">
            <History className="w-4 h-4 text-slate-400" />
            <span>Attempt Telemetry Log ({attempts.length})</span>
          </div>

          <div className="space-y-2">
            {attempts.map((att, idx) => (
              <div
                key={att.id}
                className="p-2.5 rounded-lg bg-[#060a12] border border-[#141f33] flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-2">
                  {att.isCorrect ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                  )}
                  <span className="text-slate-300 font-bold">{idx + 1}.</span>
                  <span className="text-slate-200">&quot;{att.submittedAnswer}&quot;</span>
                </div>

                <div className="flex items-center gap-3 text-[11px] text-slate-500">
                  <span
                    className={`font-semibold ${
                      att.isCorrect ? "text-emerald-400" : "text-rose-400"
                    }`}
                  >
                    {att.resultStatus}
                  </span>
                  <span>{new Date(att.attemptedAt).toLocaleTimeString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
