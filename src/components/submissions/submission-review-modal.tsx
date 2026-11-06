"use client";

import React from "react";
import { AlertTriangle, CheckCircle, ShieldAlert, X, Loader2 } from "lucide-react";

interface SubmissionReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  submitting: boolean;
  title: string;
  suspectName: string;
  motive: string;
  method: string;
  timelineSummary: string;
  explanation: string;
  supportingEvidenceCount: number;
  contradictingEvidenceCount: number;
  warnings: string[];
}

export function SubmissionReviewModal({
  isOpen,
  onClose,
  onConfirm,
  submitting,
  title,
  suspectName,
  motive,
  method,
  timelineSummary,
  explanation,
  supportingEvidenceCount,
  contradictingEvidenceCount,
  warnings,
}: SubmissionReviewModalProps) {
  if (!isOpen) return null;

  const canSubmit = warnings.length === 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-2xl bg-[#090f1d] border border-[#1b2842] rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-[#182338] flex items-center justify-between bg-[#0b1224]">
          <div className="flex items-center gap-2.5">
            <ShieldAlert className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="text-base font-bold text-slate-100 font-sans">
                Review Case Indictment & Final Judgment
              </h3>
              <p className="text-xs font-mono text-slate-400">
                Official transmission to Network High Command
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-sm">
          {/* Immutability Alert */}
          <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-800/60 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-200/90 leading-relaxed font-sans">
              <span className="font-bold text-amber-300">CRITICAL PROTOCOL:</span> Upon submission,
              this case theory is final and immutable. The evaluation engine will score your deductive
              accuracy, evaluate your cited evidence, and record your permanent investigator rating.
            </div>
          </div>

          {/* Validation Warnings */}
          {warnings.length > 0 && (
            <div className="p-4 rounded-xl bg-rose-950/50 border border-rose-800/60 space-y-2">
              <div className="text-xs font-bold font-mono text-rose-300 uppercase tracking-wider flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                <span>Incomplete Indictment Requirements:</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-xs text-rose-200">
                {warnings.map((w, idx) => (
                  <li key={idx}>{w}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Summary Fields */}
          <div className="space-y-3 bg-[#0c1424] p-4 rounded-xl border border-[#19263f]">
            <div>
              <span className="text-[10px] font-mono uppercase text-slate-500">Case Theory Title</span>
              <p className="text-xs font-semibold text-slate-200">{title || "Untitled"}</p>
            </div>

            <div>
              <span className="text-[10px] font-mono uppercase text-slate-500">
                Primary Accused Perpetrator
              </span>
              <p className="text-sm font-bold text-cyan-300">{suspectName || "None selected"}</p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/5">
              <div>
                <span className="text-[10px] font-mono uppercase text-slate-500">Supporting Evidence</span>
                <p className="text-xs font-semibold text-emerald-400 font-mono">
                  {supportingEvidenceCount} Clues Cited
                </p>
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase text-slate-500">Contradicting Evidence</span>
                <p className="text-xs font-semibold text-amber-400 font-mono">
                  {contradictingEvidenceCount} Clues Disproven
                </p>
              </div>
            </div>

            <div>
              <span className="text-[10px] font-mono uppercase text-slate-500">Motive Deduction</span>
              <p className="text-xs text-slate-300 line-clamp-2 mt-0.5">{motive || "N/A"}</p>
            </div>

            <div>
              <span className="text-[10px] font-mono uppercase text-slate-500">Method of Operation</span>
              <p className="text-xs text-slate-300 line-clamp-2 mt-0.5">{method || "N/A"}</p>
            </div>

            <div>
              <span className="text-[10px] font-mono uppercase text-slate-500">Timeline Forensics</span>
              <p className="text-xs text-slate-300 line-clamp-2 mt-0.5">{timelineSummary || "N/A"}</p>
            </div>

            <div>
              <span className="text-[10px] font-mono uppercase text-slate-500">Deductive Rationale</span>
              <p className="text-xs text-slate-300 line-clamp-3 mt-0.5">{explanation || "N/A"}</p>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-[#182338] bg-[#0b1224] flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 rounded-xl text-xs font-mono text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-colors disabled:opacity-50"
          >
            Return to Editor
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={!canSubmit || submitting}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-mono font-bold uppercase tracking-wider transition-all disabled:opacity-50 shadow-lg shadow-amber-950/40 flex items-center gap-2"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Evaluating Indictment...</span>
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4" />
                <span>Transmit Final Indictment</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
