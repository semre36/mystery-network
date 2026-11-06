"use client";

import React, { useState } from "react";
import { StickyNote, Save, Check, AlertCircle, Loader2 } from "lucide-react";
import type { SafeEvidenceNoteDto } from "@/modules/evidence/types/evidence.types";

interface EvidenceNotesEditorProps {
  investigationId: string;
  evidenceId: string;
  initialNote: SafeEvidenceNoteDto | null;
  onNoteSaved?: (note: SafeEvidenceNoteDto) => void;
}

export const EvidenceNotesEditor: React.FC<EvidenceNotesEditorProps> = ({
  investigationId,
  evidenceId,
  initialNote,
  onNoteSaved,
}) => {
  const [content, setContent] = useState(initialNote?.content || "");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const characterCount = content.length;
  const isOverLimit = characterCount > 2000;
  const hasChanged = content.trim() !== (initialNote?.content || "").trim();

  const handleSave = async () => {
    if (!content.trim()) {
      setError("Note content cannot be empty.");
      return;
    }

    if (isOverLimit) {
      setError("Note exceeds the 2,000 character maximum limit.");
      return;
    }

    try {
      setIsSaving(true);
      setError(null);
      setSuccess(false);

      const res = await fetch(
        `/api/investigations/${investigationId}/evidence/${evidenceId}/notes`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: content.trim() }),
        }
      );

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to save private field note.");
      }

      setSuccess(true);
      if (onNoteSaved) {
        onNoteSaved(json.data);
      }

      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to save note.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="rounded-lg border border-slate-800 bg-[#090d16] p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <StickyNote className="h-4 w-4 text-amber-400" />
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-200">
            Investigator Field Notes
          </h4>
        </div>
        <span className="text-[10px] text-slate-500 font-mono">🔒 Private & Confidential</span>
      </div>

      <p className="text-[11px] text-slate-400 mb-3 leading-relaxed">
        Record hypotheses, inconsistencies, or cross-references. Notes are stored in your private
        dossier and are never visible to other investigators.
      </p>

      {error && (
        <div className="mb-3 flex items-center gap-2 rounded bg-rose-950/40 border border-rose-800/50 p-2 text-xs text-rose-300">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Enter tactical observations, suspect discrepancies, or cross-referenced timestamps..."
        rows={4}
        maxLength={2000}
        className="w-full resize-y rounded-md border border-slate-800 bg-[#0c1222] p-3 text-xs text-slate-200 placeholder-slate-600 focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/50 font-sans leading-relaxed"
      />

      <div className="mt-2.5 flex items-center justify-between">
        <span
          className={`text-[10px] font-mono ${
            isOverLimit ? "text-rose-400 font-bold" : "text-slate-500"
          }`}
        >
          {characterCount} / 2,000 characters
        </span>

        <button
          onClick={handleSave}
          disabled={isSaving || !hasChanged || isOverLimit}
          className={`flex items-center gap-1.5 rounded-md px-3.5 py-1.5 text-xs font-semibold transition-all ${
            success
              ? "bg-emerald-950/80 text-emerald-300 border border-emerald-600/60"
              : hasChanged && !isOverLimit
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 cursor-pointer"
                : "bg-slate-800/40 text-slate-500 border border-slate-800 cursor-not-allowed"
          }`}
        >
          {isSaving ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span>Encrypting...</span>
            </>
          ) : success ? (
            <>
              <Check className="h-3.5 w-3.5 text-emerald-400" />
              <span>Saved to Dossier</span>
            </>
          ) : (
            <>
              <Save className="h-3.5 w-3.5" />
              <span>Save Note</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
