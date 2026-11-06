"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Lightbulb,
  Plus,
  X,
  Trash2,
  CheckCircle,
  AlertTriangle,
  MinusCircle,
  Loader2,
  AlertCircle,
  ChevronRight,
  Link2,
} from "lucide-react";
import {
  SafeInvestigationTheoryDto,
  TheoryStatus,
  TheoryEvidenceRelationship,
} from "@/modules/investigation-board/types/board.types";
import { SafeEvidenceSummaryDto } from "@/modules/evidence/types/evidence.types";

interface TheoriesDrawerProps {
  investigationId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function TheoriesDrawer({ investigationId, isOpen, onClose }: TheoriesDrawerProps) {
  const [theories, setTheories] = useState<SafeInvestigationTheoryDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTheoryId, setSelectedTheoryId] = useState<string | null>(null);
  const [theoryDetail, setTheoryDetail] = useState<SafeInvestigationTheoryDto | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // New Theory Form
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Link Evidence Form
  const [evidenceList, setEvidenceList] = useState<SafeEvidenceSummaryDto[]>([]);
  const [selectedClueId, setSelectedClueId] = useState("");
  const [relationship, setRelationship] = useState<TheoryEvidenceRelationship>(
    TheoryEvidenceRelationship.SUPPORTS
  );
  const [explanation, setExplanation] = useState("");
  const [linkingEvidence, setLinkingEvidence] = useState(false);

  const fetchTheories = useCallback(() => {
    fetch(`/api/investigations/${investigationId}/theories`)
      .then((res) => res.json())
      .then((json) => {
        if (json.ok) {
          setTheories(json.data.theories || []);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [investigationId]);

  useEffect(() => {
    if (isOpen) {
      fetchTheories();
    }
  }, [isOpen, fetchTheories]);

  // Load detail when a theory is selected
  useEffect(() => {
    if (!selectedTheoryId) {
      return;
    }

    fetch(`/api/investigations/${investigationId}/theories/${selectedTheoryId}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.ok) {
          setTheoryDetail(json.data.theory);
        }
      })
      .catch(() => {})
      .finally(() => setDetailLoading(false));

    // Also fetch available evidence to link
    fetch(`/api/investigations/${investigationId}/evidence?limit=50`)
      .then((res) => res.json())
      .then((json) => {
        if (json.ok) {
          setEvidenceList(json.data.items || []);
        }
      })
      .catch(() => {});
  }, [investigationId, selectedTheoryId]);

  const handleCreateTheory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/investigations/${investigationId}/theories`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          status: TheoryStatus.ACTIVE,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to create theory");
      }

      setTheories((prev) => [json.data.theory, ...prev]);
      setTitle("");
      setDescription("");
      setIsCreating(false);
    } catch (err: any) {
      setError(err.message || "Failed to create hypothesis");
    } finally {
      setSubmitting(false);
    }
  };

  const handleLinkEvidence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTheoryId || !selectedClueId) return;

    setLinkingEvidence(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/investigations/${investigationId}/theories/${selectedTheoryId}/evidence`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            clueId: selectedClueId,
            relationship,
            explanation: explanation.trim() || undefined,
          }),
        }
      );

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to link evidence");
      }

      // Refresh detail
      setSelectedTheoryId(selectedTheoryId);
      setSelectedClueId("");
      setExplanation("");
      fetchTheories();
    } catch (err: any) {
      setError(err.message || "Failed to link evidence");
    } finally {
      setLinkingEvidence(false);
    }
  };

  const handleRemoveEvidence = async (associationId: string) => {
    if (!selectedTheoryId) return;
    try {
      const res = await fetch(
        `/api/investigations/${investigationId}/theories/${selectedTheoryId}/evidence/${associationId}`,
        {
          method: "DELETE",
        }
      );
      if (res.ok) {
        setTheoryDetail((prev) =>
          prev
            ? {
                ...prev,
                evidence: (prev.evidence || []).filter((e) => e.id !== associationId),
              }
            : null
        );
        fetchTheories();
      }
    } catch {}
  };

  const handleDeleteTheory = async (theoryId: string) => {
    try {
      const res = await fetch(`/api/investigations/${investigationId}/theories/${theoryId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setTheories((prev) => prev.filter((t) => t.id !== theoryId));
        if (selectedTheoryId === theoryId) {
          setSelectedTheoryId(null);
          setTheoryDetail(null);
        }
      }
    } catch {}
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-40 w-80 sm:w-[500px] bg-[#090f1a] border-l border-[#1a253c] shadow-2xl flex flex-col animate-slideInRight">
      {/* Header */}
      <div className="p-4 border-b border-[#18233a] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-purple-400" />
          <h3 className="text-sm font-semibold text-slate-100 font-sans">
            Investigation Theories & Hypotheses
          </h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {selectedTheoryId && theoryDetail ? (
        // DETAIL VIEW: Theory with linked evidence
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="p-3 border-b border-[#141c2e] flex items-center justify-between bg-[#0b1220]">
            <button
              type="button"
              onClick={() => {
                setSelectedTheoryId(null);
                setTheoryDetail(null);
              }}
              className="text-xs font-mono text-purple-400 hover:text-purple-300 flex items-center gap-1"
            >
              ← Back to Hypotheses
            </button>
            <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-purple-950/80 border border-purple-800 text-purple-300">
              {theoryDetail.status}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-5">
            <div>
              <h3 className="text-sm font-bold text-slate-100 font-sans">{theoryDetail.title}</h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed font-sans">
                {theoryDetail.description}
              </p>
              <div className="mt-2 text-[10px] font-mono text-slate-500">
                Formulated by {theoryDetail.createdByCodename} on{" "}
                {new Date(theoryDetail.createdAt).toLocaleDateString()}
              </div>
            </div>

            {/* Evidence summary counter */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2 rounded-xl bg-emerald-950/40 border border-emerald-800/40">
                <div className="text-xs font-bold font-mono text-emerald-400">
                  {theoryDetail.evidenceSummary.supports}
                </div>
                <div className="text-[9px] font-mono text-slate-400 uppercase">Supporting</div>
              </div>
              <div className="p-2 rounded-xl bg-rose-950/40 border border-rose-800/40">
                <div className="text-xs font-bold font-mono text-rose-400">
                  {theoryDetail.evidenceSummary.contradicts}
                </div>
                <div className="text-[9px] font-mono text-slate-400 uppercase">Contradicting</div>
              </div>
              <div className="p-2 rounded-xl bg-slate-900/60 border border-slate-800">
                <div className="text-xs font-bold font-mono text-slate-300">
                  {theoryDetail.evidenceSummary.neutral}
                </div>
                <div className="text-[9px] font-mono text-slate-400 uppercase">Contextual</div>
              </div>
            </div>

            {/* Link Evidence Form */}
            <form
              onSubmit={handleLinkEvidence}
              className="p-3.5 rounded-xl bg-[#0c1424] border border-[#19243b] space-y-3"
            >
              <div className="text-xs font-semibold text-slate-200 font-sans flex items-center gap-1.5">
                <Link2 className="w-3.5 h-3.5 text-purple-400" />
                <span>Associate Evidence to Theory</span>
              </div>

              <div>
                <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block mb-1">
                  Select Declassified Clue *
                </label>
                <select
                  required
                  value={selectedClueId}
                  onChange={(e) => setSelectedClueId(e.target.value)}
                  className="w-full px-2 py-1.5 rounded-lg bg-[#080d17] border border-[#19243b] text-xs text-slate-200 focus:outline-none focus:border-purple-500 font-sans"
                >
                  <option value="">-- Choose Evidence Item --</option>
                  {evidenceList.map((clue) => (
                    <option key={clue.id} value={clue.id}>
                      [{clue.clueCode || clue.clueType}] {clue.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-1.5">
                {[
                  {
                    type: TheoryEvidenceRelationship.SUPPORTS,
                    label: "Supports",
                    color: "text-emerald-400",
                  },
                  {
                    type: TheoryEvidenceRelationship.CONTRADICTS,
                    label: "Contradicts",
                    color: "text-rose-400",
                  },
                  {
                    type: TheoryEvidenceRelationship.NEUTRAL,
                    label: "Neutral",
                    color: "text-slate-300",
                  },
                ].map((opt) => (
                  <button
                    key={opt.type}
                    type="button"
                    onClick={() => setRelationship(opt.type)}
                    className={`py-1.5 px-2 rounded-lg border text-center text-[10px] font-mono font-semibold transition-all ${
                      relationship === opt.type
                        ? "border-purple-500 bg-purple-950/60 text-purple-300 ring-1 ring-purple-500"
                        : "border-[#1c273e] bg-[#080d17] text-slate-400"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              <div>
                <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block mb-1">
                  Reasoning / Explanation (Optional)
                </label>
                <input
                  type="text"
                  value={explanation}
                  onChange={(e) => setExplanation(e.target.value)}
                  placeholder="How does this clue support or dispute the theory?"
                  className="w-full px-3 py-1.5 rounded-lg bg-[#080d17] border border-[#19243b] text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-purple-500 font-sans"
                />
              </div>

              <button
                type="submit"
                disabled={linkingEvidence || !selectedClueId}
                className="w-full py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-mono font-semibold transition-colors disabled:opacity-50"
              >
                {linkingEvidence ? "Associating..." : "Link Evidence to Hypothesis"}
              </button>
            </form>

            {/* Associated Evidence List */}
            <div className="space-y-2">
              <div className="text-xs font-mono text-slate-400 uppercase tracking-wider">
                Linked Evidence ({theoryDetail.evidence?.length || 0})
              </div>

              {theoryDetail.evidence && theoryDetail.evidence.length > 0 ? (
                theoryDetail.evidence.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-xl bg-[#0c1424] border border-[#18233a] space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        {item.relationship === TheoryEvidenceRelationship.SUPPORTS ? (
                          <span className="text-[9px] font-mono text-emerald-400 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-800 flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" /> Supports
                          </span>
                        ) : item.relationship === TheoryEvidenceRelationship.CONTRADICTS ? (
                          <span className="text-[9px] font-mono text-rose-400 bg-rose-950/60 px-1.5 py-0.5 rounded border border-rose-800 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" /> Contradicts
                          </span>
                        ) : (
                          <span className="text-[9px] font-mono text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-700 flex items-center gap-1">
                            <MinusCircle className="w-3 h-3" /> Neutral
                          </span>
                        )}
                        <span className="text-xs font-semibold text-slate-200 font-sans">
                          {item.clueTitle}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveEvidence(item.id)}
                        className="text-slate-500 hover:text-rose-400 p-1 rounded"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {item.explanation && (
                      <p className="text-[11px] text-slate-400 leading-relaxed font-sans pl-1">
                        &quot;{item.explanation}&quot;
                      </p>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-slate-500 font-mono text-xs">
                  No evidence linked yet. Associate clues above to test this hypothesis.
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        // LIST VIEW: Hypotheses overview
        <>
          <div className="p-3 border-b border-[#141c2e] flex items-center justify-between">
            <span className="text-[11px] font-mono text-slate-400">
              Active Hypotheses: {theories.length}
            </span>
            <button
              type="button"
              onClick={() => setIsCreating(!isCreating)}
              className="px-3 py-1.5 rounded-lg bg-purple-950/80 hover:bg-purple-900 border border-purple-700/50 text-purple-300 text-xs font-mono font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isCreating ? "Cancel" : "New Hypothesis"}</span>
            </button>
          </div>

          {/* New Theory Form */}
          {isCreating && (
            <form
              onSubmit={handleCreateTheory}
              className="p-4 border-b border-[#141c2e] bg-[#0c1424] space-y-3"
            >
              <div className="text-xs font-semibold text-purple-300 font-sans">
                Formulate Hypothesis
              </div>

              {error && (
                <div className="p-2 rounded bg-rose-950/50 border border-rose-800 text-[11px] text-rose-300 flex items-center gap-1.5 font-mono">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block mb-1">
                  Theory Headline *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Inside job orchestrated via hijacked credentials"
                  className="w-full px-3 py-1.5 rounded-lg bg-[#080d17] border border-[#19243b] text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-purple-500 font-sans"
                />
              </div>

              <div>
                <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block mb-1">
                  Investigative Hypothesis & Motive *
                </label>
                <textarea
                  required
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Detail the sequence of events, suspect motive, and technical vectors..."
                  className="w-full px-3 py-1.5 rounded-lg bg-[#080d17] border border-[#19243b] text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-purple-500 font-sans resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-mono font-semibold transition-colors disabled:opacity-50"
              >
                {submitting ? "Formulating..." : "Establish Theory"}
              </button>
            </form>
          )}

          {/* Theories List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-48 text-slate-500 gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-purple-500" />
                <span className="text-xs font-mono">Querying intelligence theories...</span>
              </div>
            ) : theories.length === 0 ? (
              <div className="text-center py-12 text-slate-500 font-mono text-xs">
                No theories formulated yet. Click &quot;New Hypothesis&quot; to begin building your
                case deduction.
              </div>
            ) : (
              theories.map((t) => (
                <div
                  key={t.id}
                  onClick={() => setSelectedTheoryId(t.id)}
                  className="p-3.5 rounded-xl bg-[#0c1424] border border-[#19243b] hover:border-purple-500/50 transition-all space-y-2 cursor-pointer group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-purple-950/80 border border-purple-800/60 text-purple-300">
                        {t.status}
                      </span>
                      <h4 className="text-xs font-semibold text-slate-100 font-sans mt-1">
                        {t.title}
                      </h4>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-purple-400 group-hover:translate-x-0.5 transition-all" />
                  </div>

                  <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed font-sans">
                    {t.description}
                  </p>

                  <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[10px] font-mono">
                    <div className="flex items-center gap-2">
                      <span className="text-emerald-400 font-semibold">
                        +{t.evidenceSummary.supports} Supports
                      </span>
                      <span className="text-rose-400 font-semibold">
                        -{t.evidenceSummary.contradicts} Contradicts
                      </span>
                    </div>
                    <span className="text-slate-500">By {t.createdByCodename}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
