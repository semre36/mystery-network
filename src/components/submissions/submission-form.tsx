"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ShieldAlert,
  UserCheck,
  FileText,
  Clock,
  Layers,
  CheckCircle,
  Save,
  AlertTriangle,
  Loader2,
  FileCheck,
  Ban,
} from "lucide-react";
import type { SafeCaseSubmissionDto } from "@/modules/submissions/types/submission.types";
import { SubmissionReviewModal } from "./submission-review-modal";

interface CaseCharacterOption {
  id: string;
  name: string;
  description: string;
  role?: string;
}

interface EvidenceOption {
  id: string;
  clueCode: string | null;
  title: string;
  descriptionSnippet?: string;
  clueType: string;
}

interface SubmissionFormProps {
  investigationId: string;
  initialSubmission: SafeCaseSubmissionDto | null;
  caseCode: string;
  caseTitle: string;
  characters: CaseCharacterOption[];
  availableEvidence: EvidenceOption[];
  isCooperative: boolean;
  canSubmit: boolean;
}

export function SubmissionForm({
  investigationId,
  initialSubmission,
  caseCode,
  caseTitle,
  characters,
  availableEvidence,
  canSubmit,
}: SubmissionFormProps) {
  const router = useRouter();

  // Form State
  const answer = initialSubmission?.answerData;
  const [title, setTitle] = useState(
    initialSubmission?.title || answer?.title || "Operational Case Indictment"
  );
  const [primaryCharacterId, setPrimaryCharacterId] = useState(answer?.primaryCharacterId || "");
  const [motive, setMotive] = useState(answer?.motive || "");
  const [method, setMethod] = useState(answer?.method || "");
  const [timelineSummary, setTimelineSummary] = useState(answer?.timelineSummary || "");
  const [explanation, setExplanation] = useState(answer?.explanation || "");
  const [supportingEvidenceIds, setSupportingEvidenceIds] = useState<string[]>(
    answer?.supportingEvidenceIds || []
  );
  const [contradictingEvidenceIds, setContradictingEvidenceIds] = useState<string[]>(
    answer?.contradictingEvidenceIds || []
  );
  const [additionalFindings, setAdditionalFindings] = useState(answer?.additionalFindings || "");

  // Status & UI State
  const [savingDraft, setSavingDraft] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [draftSavedMessage, setDraftSavedMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isReviewOpen, setIsReviewOpen] = useState(false);

  // Toggle Evidence Citation
  const toggleSupporting = (clueId: string) => {
    setContradictingEvidenceIds((prev) => prev.filter((id) => id !== clueId));
    setSupportingEvidenceIds((prev) =>
      prev.includes(clueId) ? prev.filter((id) => id !== clueId) : [...prev, clueId]
    );
  };

  const toggleContradicting = (clueId: string) => {
    setSupportingEvidenceIds((prev) => prev.filter((id) => id !== clueId));
    setContradictingEvidenceIds((prev) =>
      prev.includes(clueId) ? prev.filter((id) => id !== clueId) : [...prev, clueId]
    );
  };

  // Validation Warnings Check
  const getValidationWarnings = () => {
    const warnings: string[] = [];
    if (!title.trim() || title.length < 3) warnings.push("Title must be at least 3 characters.");
    if (!primaryCharacterId) warnings.push("You must designate a primary suspect.");
    if (!motive.trim() || motive.length < 10)
      warnings.push("Motive description must be at least 10 characters.");
    if (!method.trim() || method.length < 10)
      warnings.push("Methodology description must be at least 10 characters.");
    if (!timelineSummary.trim() || timelineSummary.length < 10)
      warnings.push("Timeline sequence must be at least 10 characters.");
    if (!explanation.trim() || explanation.length < 20)
      warnings.push("Comprehensive deductive explanation must be at least 20 characters.");
    if (supportingEvidenceIds.length === 0)
      warnings.push("At least one supporting clue must be cited.");
    return warnings;
  };

  // Save Draft
  const handleSaveDraft = async () => {
    setSavingDraft(true);
    setError(null);
    setDraftSavedMessage(null);

    try {
      const payload = {
        title: title.trim(),
        primaryCharacterId: primaryCharacterId || null,
        additionalCharacterIds: [],
        motive: motive.trim(),
        method: method.trim(),
        timelineSummary: timelineSummary.trim(),
        explanation: explanation.trim(),
        supportingEvidenceIds,
        contradictingEvidenceIds,
        additionalFindings: additionalFindings.trim(),
      };

      const res = await fetch(`/api/investigations/${investigationId}/submissions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to save draft");
      }

      setDraftSavedMessage("Indictment draft saved to intelligence archive.");
      setTimeout(() => setDraftSavedMessage(null), 4000);
    } catch (err: any) {
      setError(err.message || "Failed to save draft");
    } finally {
      setSavingDraft(false);
    }
  };

  // Final Submit
  const handleFinalSubmit = async () => {
    const warnings = getValidationWarnings();
    if (warnings.length > 0) return;

    setSubmitting(true);
    setError(null);

    try {
      const payload = {
        title: title.trim(),
        primaryCharacterId,
        additionalCharacterIds: [],
        motive: motive.trim(),
        method: method.trim(),
        timelineSummary: timelineSummary.trim(),
        explanation: explanation.trim(),
        supportingEvidenceIds,
        contradictingEvidenceIds,
        additionalFindings: additionalFindings.trim(),
      };

      const res = await fetch(`/api/investigations/${investigationId}/submissions/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to submit indictment");
      }

      setIsReviewOpen(false);
      router.push(`/investigations/${investigationId}/results`);
    } catch (err: any) {
      setError(err.message || "Failed to submit indictment");
      setIsReviewOpen(false);
    } finally {
      setSubmitting(false);
    }
  };

  const selectedCharacter = characters.find((c) => c.id === primaryCharacterId);
  const warnings = getValidationWarnings();

  return (
    <div className="space-y-8">
      {/* Tactical Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-[#090f1d] border border-[#19263f]">
        <div>
          <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider">
            {caseCode} • FINAL RESOLUTION
          </span>
          <h2 className="text-lg font-bold text-slate-100 font-sans">{caseTitle}</h2>
        </div>

        <div className="flex items-center gap-3">
          {draftSavedMessage && (
            <span className="text-xs font-mono text-emerald-400 flex items-center gap-1.5 animate-fadeIn">
              <CheckCircle className="w-3.5 h-3.5" />
              {draftSavedMessage}
            </span>
          )}

          <button
            type="button"
            onClick={handleSaveDraft}
            disabled={savingDraft || submitting}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#121c2e] hover:bg-[#18263e] border border-[#223352] text-xs font-mono text-slate-200 transition-colors disabled:opacity-50"
          >
            {savingDraft ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5 text-cyan-400" />
            )}
            <span>Save Draft</span>
          </button>

          {canSubmit ? (
            <button
              type="button"
              onClick={() => setIsReviewOpen(true)}
              disabled={submitting}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-mono text-xs font-bold uppercase tracking-wider transition-all shadow-md shadow-amber-950/40"
            >
              <FileCheck className="w-4 h-4" />
              <span>Review & Submit Indictment</span>
            </button>
          ) : (
            <span className="text-xs font-mono text-slate-500 px-3 py-1.5 rounded-lg bg-[#0e1524] border border-[#1b263b]">
              Cooperative Role: Detective (View/Edit Draft)
            </span>
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-950/50 border border-rose-800 text-rose-200 text-xs font-mono flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* 1. Indictment Title */}
      <section className="p-6 rounded-2xl bg-[#0c1424] border border-[#1b2943] space-y-3">
        <label className="text-xs font-mono text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
          <FileText className="w-3.5 h-3.5 text-cyan-400" />
          <span>Official Case Theory Title *</span>
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Operation Nightfall: Internal Sabotage at Zurich Relay"
          className="w-full px-4 py-2.5 rounded-xl bg-[#080d17] border border-[#1d2c47] text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 font-sans"
        />
      </section>

      {/* 2. Suspect Designation */}
      <section className="p-6 rounded-2xl bg-[#0c1424] border border-[#1b2943] space-y-4">
        <div className="flex items-center justify-between">
          <label className="text-xs font-mono text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <UserCheck className="w-3.5 h-3.5 text-amber-400" />
            <span>Designate Primary Perpetrator *</span>
          </label>
          <span className="text-[11px] font-mono text-slate-500">
            Select the individual responsible for the operational breach
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {characters.map((char) => {
            const isSelected = primaryCharacterId === char.id;
            return (
              <div
                key={char.id}
                onClick={() => setPrimaryCharacterId(char.id)}
                className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? "bg-amber-950/40 border-amber-500 shadow-md shadow-amber-950/40"
                    : "bg-[#090f1b] border-[#182338] hover:border-slate-600"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-bold text-slate-100 font-sans">{char.name}</span>
                    {isSelected && (
                      <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/50">
                        Primary Accused
                      </span>
                    )}
                  </div>
                  {char.role && (
                    <span className="text-[10px] font-mono text-slate-400 block mb-2">
                      Role: {char.role}
                    </span>
                  )}
                  <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                    {char.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 3. Motive, Method, Timeline Forensics */}
      <section className="p-6 rounded-2xl bg-[#0c1424] border border-[#1b2943] space-y-6">
        <h3 className="text-xs font-mono text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-purple-400" />
          <span>Forensic Reconstruction & Operational Vectors</span>
        </h3>

        {/* Motive */}
        <div className="space-y-2">
          <label className="text-xs font-mono text-slate-400">
            Motive & Objectives * (Explain why the perpetrator acted)
          </label>
          <textarea
            rows={3}
            value={motive}
            onChange={(e) => setMotive(e.target.value)}
            placeholder="Detail the perpetrator's ultimate goal, financial payoff, syndicate coercion, or cover-up objectives..."
            className="w-full px-4 py-2.5 rounded-xl bg-[#080d17] border border-[#1d2c47] text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 font-sans resize-none"
          />
        </div>

        {/* Method */}
        <div className="space-y-2">
          <label className="text-xs font-mono text-slate-400">
            Method of Operation & Technical Vector * (How was the crime committed?)
          </label>
          <textarea
            rows={3}
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            placeholder="Explain terminal overrides, security circumvention, physical bypasses, and clandestine equipment utilized..."
            className="w-full px-4 py-2.5 rounded-xl bg-[#080d17] border border-[#1d2c47] text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 font-sans resize-none"
          />
        </div>

        {/* Timeline Summary */}
        <div className="space-y-2">
          <label className="text-xs font-mono text-slate-400">
            Chronological Sequence & Window * (Order of key events)
          </label>
          <textarea
            rows={3}
            value={timelineSummary}
            onChange={(e) => setTimelineSummary(e.target.value)}
            placeholder="Detail the event sequence with timestamps (e.g. 02:50 Sector B entry, 02:58 override initiated, 03:00 blackout triggered)..."
            className="w-full px-4 py-2.5 rounded-xl bg-[#080d17] border border-[#1d2c47] text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 font-sans resize-none"
          />
        </div>
      </section>

      {/* 4. Evidence Citation Workbench */}
      <section className="p-6 rounded-2xl bg-[#0c1424] border border-[#1b2943] space-y-4">
        <div className="flex items-center justify-between">
          <label className="text-xs font-mono text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-emerald-400" />
            <span>Classified Evidence Citations *</span>
          </label>
          <div className="flex items-center gap-3 text-[11px] font-mono">
            <span className="text-emerald-400">{supportingEvidenceIds.length} Supporting</span>
            <span className="text-amber-400">{contradictingEvidenceIds.length} Contradicting</span>
          </div>
        </div>
        <p className="text-xs text-slate-400">
          Tag unlocked case evidence as either directly supporting your indictment or recognized as
          contradictory / misleading.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto p-1">
          {availableEvidence.map((clue) => {
            const isSupporting = supportingEvidenceIds.includes(clue.id);
            const isContradicting = contradictingEvidenceIds.includes(clue.id);

            return (
              <div
                key={clue.id}
                className="p-3.5 rounded-xl bg-[#090f1b] border border-[#182338] flex flex-col justify-between space-y-2"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-800">
                      {clue.clueCode || "CLUE"}
                    </span>
                    <span className="text-[10px] font-mono text-slate-500 uppercase">
                      {clue.clueType}
                    </span>
                  </div>
                  <h4 className="text-xs font-semibold text-slate-200 font-sans">{clue.title}</h4>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                  <button
                    type="button"
                    onClick={() => toggleSupporting(clue.id)}
                    className={`flex-1 py-1 px-2 rounded text-[11px] font-mono transition-colors flex items-center justify-center gap-1 ${
                      isSupporting
                        ? "bg-emerald-600 text-white font-bold"
                        : "bg-[#11192a] text-slate-400 hover:text-emerald-300"
                    }`}
                  >
                    <CheckCircle className="w-3 h-3" />
                    <span>Supports</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => toggleContradicting(clue.id)}
                    className={`flex-1 py-1 px-2 rounded text-[11px] font-mono transition-colors flex items-center justify-center gap-1 ${
                      isContradicting
                        ? "bg-amber-600 text-white font-bold"
                        : "bg-[#11192a] text-slate-400 hover:text-amber-300"
                    }`}
                  >
                    <Ban className="w-3 h-3" />
                    <span>Contradicts</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 5. Comprehensive Deductive Narrative */}
      <section className="p-6 rounded-2xl bg-[#0c1424] border border-[#1b2943] space-y-3">
        <label className="text-xs font-mono text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
          <FileText className="w-3.5 h-3.5 text-cyan-400" />
          <span>Final Deductive Rationale & Case Explanation *</span>
        </label>
        <p className="text-xs text-slate-400">
          Present your holistic closing argument connecting motive, method, forensic evidence, and
          suspect identity.
        </p>
        <textarea
          rows={5}
          value={explanation}
          onChange={(e) => setExplanation(e.target.value)}
          placeholder="Synthesize the entire case narrative: how the pieces connect, why alternative suspects were cleared, and why this conclusion is definitive..."
          className="w-full px-4 py-2.5 rounded-xl bg-[#080d17] border border-[#1d2c47] text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 font-sans resize-none"
        />
      </section>

      {/* Review Modal */}
      <SubmissionReviewModal
        isOpen={isReviewOpen}
        onClose={() => setIsReviewOpen(false)}
        onConfirm={handleFinalSubmit}
        submitting={submitting}
        title={title}
        suspectName={selectedCharacter?.name || "None designated"}
        motive={motive}
        method={method}
        timelineSummary={timelineSummary}
        explanation={explanation}
        supportingEvidenceCount={supportingEvidenceIds.length}
        contradictingEvidenceCount={contradictingEvidenceIds.length}
        warnings={warnings}
      />
    </div>
  );
}
