"use client";

import React from "react";
import Link from "next/link";
import {
  Award,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Shield,
  Layers,
  ArrowRight,
  TrendingUp,
  RotateCcw,
  Sparkles,
  Zap,
} from "lucide-react";
import { EvaluationResult } from "@prisma/client";
import type { SafeInvestigationResultDto } from "@/modules/submissions/types/submission.types";

interface ResultsViewProps {
  results: SafeInvestigationResultDto;
}

const RESULT_CONFIG: Record<
  EvaluationResult,
  { label: string; bg: string; border: string; text: string; icon: React.ElementType }
> = {
  SOLVED_PERFECT: {
    label: "Case Solved — Flawless Deduction",
    bg: "bg-emerald-950/70",
    border: "border-emerald-500",
    text: "text-emerald-300",
    icon: Sparkles,
  },
  SOLVED_PARTIAL: {
    label: "Case Solved — Substantial Deduction",
    bg: "bg-cyan-950/70",
    border: "border-cyan-500",
    text: "text-cyan-300",
    icon: CheckCircle2,
  },
  INCORRECT: {
    label: "Indictment Rejected — Forensic Discrepancy",
    bg: "bg-rose-950/70",
    border: "border-rose-500",
    text: "text-rose-300",
    icon: XCircle,
  },
  COLD_CASE: {
    label: "Operation Inconclusive — Cold Case",
    bg: "bg-slate-950/70",
    border: "border-slate-600",
    text: "text-slate-400",
    icon: AlertTriangle,
  },
};

export function ResultsView({ results }: ResultsViewProps) {
  const { evaluation, submission, caseTitle, caseCode, difficulty } = results;
  const { feedback, score, result } = evaluation;
  const cfg = RESULT_CONFIG[result] || RESULT_CONFIG.SOLVED_PARTIAL;
  const StatusIcon = cfg.icon;

  const dims = feedback.dimensions;

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* 1. Header Banner & Outcome */}
      <div
        className={`p-6 sm:p-8 rounded-3xl border ${cfg.bg} ${cfg.border} shadow-2xl relative overflow-hidden backdrop-blur-md`}
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-black/40 border border-white/10 text-slate-300">
                {caseCode} • {difficulty}
              </span>
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-black/40 border border-white/10 text-cyan-300">
                Official Case Judgment
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-100 font-sans">{caseTitle}</h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl font-sans leading-relaxed">
              {feedback.summary}
            </p>
          </div>

          {/* Big Score Box */}
          <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-[#090f1a]/90 border border-white/10 shadow-lg min-w-[130px]">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
              Deductive Score
            </span>
            <div className="flex items-baseline gap-1 my-1">
              <span className="text-3xl font-extrabold font-mono text-slate-100">{score}</span>
              <span className="text-xs font-mono text-slate-400">/ 100</span>
            </div>
            <div className={`text-[10px] font-mono font-bold uppercase flex items-center gap-1 ${cfg.text}`}>
              <StatusIcon className="w-3 h-3" />
              <span>{result.replace("_", " ")}</span>
            </div>
          </div>
        </div>

        {/* Rewards Bar */}
        {(feedback.xpAwarded > 0 || feedback.achievementsUnlocked?.length > 0) && (
          <div className="mt-6 pt-5 border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-mono text-slate-300 uppercase tracking-wider">
                Rewards Credited to Dossier:
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-3 font-mono text-xs">
              {feedback.xpAwarded > 0 && (
                <span className="px-3 py-1 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold flex items-center gap-1">
                  +{feedback.xpAwarded} XP
                </span>
              )}
              {feedback.achievementsUnlocked?.map((code) => (
                <span
                  key={code}
                  className="px-3 py-1 rounded-lg bg-purple-500/20 border border-purple-500/40 text-purple-300 font-bold flex items-center gap-1.5"
                >
                  <Award className="w-3.5 h-3.5" />
                  <span>{code}</span>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 2. Deductive Dimensions Breakdown */}
      <section className="space-y-4">
        <div className="text-xs font-mono text-slate-400 uppercase tracking-wider flex items-center gap-2">
          <Layers className="w-4 h-4 text-cyan-400" />
          <span>Evaluation Criteria Breakdown</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {/* Dimension 1: Primary Suspect */}
          <div className="p-4 rounded-xl bg-[#0b1220] border border-[#17233a] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-200">Primary Suspect</span>
              <span className="text-xs font-mono font-bold text-cyan-400">
                {dims.primarySuspect.score} / {dims.primarySuspect.maxScore}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed font-sans">{dims.primarySuspect.notes}</p>
          </div>

          {/* Dimension 2: Motive */}
          <div className="p-4 rounded-xl bg-[#0b1220] border border-[#17233a] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-200">Motive Deduction</span>
              <span className="text-xs font-mono font-bold text-cyan-400">
                {dims.motive.score} / {dims.motive.maxScore}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed font-sans">{dims.motive.notes}</p>
          </div>

          {/* Dimension 3: Method */}
          <div className="p-4 rounded-xl bg-[#0b1220] border border-[#17233a] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-200">Method & Vector</span>
              <span className="text-xs font-mono font-bold text-cyan-400">
                {dims.method.score} / {dims.method.maxScore}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed font-sans">{dims.method.notes}</p>
          </div>

          {/* Dimension 4: Timeline */}
          <div className="p-4 rounded-xl bg-[#0b1220] border border-[#17233a] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-200">Timeline Sequence</span>
              <span className="text-xs font-mono font-bold text-cyan-400">
                {dims.timeline.score} / {dims.timeline.maxScore}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed font-sans">{dims.timeline.notes}</p>
          </div>

          {/* Dimension 5: Supporting Evidence */}
          <div className="p-4 rounded-xl bg-[#0b1220] border border-[#17233a] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-200">Supporting Evidence</span>
              <span className="text-xs font-mono font-bold text-emerald-400">
                {dims.supportingEvidence.score} / {dims.supportingEvidence.maxScore}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed font-sans">{dims.supportingEvidence.notes}</p>
          </div>

          {/* Dimension 6: Contradicting Evidence */}
          <div className="p-4 rounded-xl bg-[#0b1220] border border-[#17233a] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-200">Contradicting Clues</span>
              <span className="text-xs font-mono font-bold text-amber-400">
                {dims.contradictingEvidence.score} / {dims.contradictingEvidence.maxScore}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
              {dims.contradictingEvidence.notes}
            </p>
          </div>
        </div>
      </section>

      {/* 3. Forensic Debrief: Correct vs Discrepancies */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Correct Conclusions */}
        <div className="p-5 rounded-2xl bg-[#0a1120] border border-[#182338] space-y-3">
          <div className="text-xs font-mono text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4" />
            <span>Accurate Conclusions</span>
          </div>

          {feedback.correctConclusions.length > 0 ? (
            <ul className="space-y-2 text-xs text-slate-300">
              {feedback.correctConclusions.map((c, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-emerald-500 font-bold">•</span>
                  <span>{c}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-slate-500 font-mono">No verified deductions.</p>
          )}
        </div>

        {/* Missed Reasoning Areas */}
        <div className="p-5 rounded-2xl bg-[#0a1120] border border-[#182338] space-y-3">
          <div className="text-xs font-mono text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4" />
            <span>Deductive Discrepancies</span>
          </div>

          {feedback.missedReasoningAreas.length > 0 ? (
            <ul className="space-y-2 text-xs text-slate-300">
              {feedback.missedReasoningAreas.map((m, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-amber-500 font-bold">•</span>
                  <span>{m}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-slate-500 font-mono">No significant discrepancies detected.</p>
          )}
        </div>
      </section>

      {/* 4. Evidence Citations Assessment */}
      <section className="p-5 rounded-2xl bg-[#0a1120] border border-[#182338] space-y-4">
        <div className="text-xs font-mono text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
          <Shield className="w-4 h-4 text-cyan-400" />
          <span>Evidence Citation Forensic Analysis</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-sans">
          {/* Useful references */}
          <div className="p-3.5 rounded-xl bg-[#060b14] border border-[#141d2e] space-y-2">
            <span className="text-[10px] font-mono uppercase text-emerald-400 font-semibold">
              Crucial Evidence Corroborated
            </span>
            {feedback.evidenceFeedback.usefulReferences.length > 0 ? (
              <ul className="space-y-1.5 text-slate-300">
                {feedback.evidenceFeedback.usefulReferences.map((ref, idx) => (
                  <li key={idx} className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>{ref}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-slate-500 font-mono text-[11px]">No essential clues cited.</p>
            )}
          </div>

          {/* Missed evidence */}
          <div className="p-3.5 rounded-xl bg-[#060b14] border border-[#141d2e] space-y-2">
            <span className="text-[10px] font-mono uppercase text-rose-400 font-semibold">
              Critical Evidence Unaccounted For
            </span>
            {feedback.evidenceFeedback.missedEvidence.length > 0 ? (
              <ul className="space-y-1.5 text-slate-300">
                {feedback.evidenceFeedback.missedEvidence.map((miss, idx) => (
                  <li key={idx} className="flex items-center gap-1.5">
                    <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                    <span>{miss}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-slate-500 font-mono text-[11px]">All vital clues accounted for.</p>
            )}
          </div>
        </div>
      </section>

      {/* 5. Navigation & Next Chapter */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-[#182338]">
        <Link
          href={`/investigations/${results.investigationId}`}
          className="px-4 py-2 rounded-xl bg-[#0e1626] hover:bg-[#152037] border border-[#1f2d47] text-xs font-mono text-slate-300 transition-colors"
        >
          ← Return to Case Workspace
        </Link>

        <div className="flex items-center gap-3">
          <Link
            href={`/investigations/${results.investigationId}/board`}
            className="px-4 py-2 rounded-xl bg-[#141026] hover:bg-[#1e173b] border border-purple-500/40 text-xs font-mono text-purple-300 transition-colors"
          >
            Review Crime Board
          </Link>

          <Link
            href="/profile/progression"
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-slate-950 font-mono text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-md shadow-cyan-950/40"
          >
            <span>Inspect Operative Dossier</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}

