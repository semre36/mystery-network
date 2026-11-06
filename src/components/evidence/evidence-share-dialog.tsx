"use client";

import React, { useState } from "react";
import { Share2, Users, Check, AlertCircle, Loader2, X } from "lucide-react";
import type { SafeEvidenceShareInfoDto } from "@/modules/evidence/types/evidence.types";

interface EvidenceShareDialogProps {
  investigationId: string;
  evidenceId: string;
  evidenceTitle: string;
  clueCode: string;
  eligibleRecipients: Array<{
    id: string;
    codename: string;
    displayName: string;
  }>;
  existingShares: SafeEvidenceShareInfoDto[];
  onShared?: (newShare: SafeEvidenceShareInfoDto) => void;
  onClose?: () => void;
}

export const EvidenceShareDialog: React.FC<EvidenceShareDialogProps> = ({
  investigationId,
  evidenceId,
  evidenceTitle,
  clueCode,
  eligibleRecipients,
  existingShares,
  onShared,
  onClose,
}) => {
  const [selectedRecipientId, setSelectedRecipientId] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filter out operatives who already have an active share
  const alreadySharedPlayerIds = new Set(
    existingShares.filter((s) => s.isMine).map((s) => s.recipientPlayerCodename)
  );

  const availableRecipients = eligibleRecipients.filter(
    (r) => !alreadySharedPlayerIds.has(r.codename)
  );

  const handleShare = async () => {
    try {
      setIsSubmitting(true);
      setError(null);
      setSuccessMessage(null);

      const res = await fetch(
        `/api/investigations/${investigationId}/evidence/${evidenceId}/share`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            recipientPlayerId: selectedRecipientId || undefined,
          }),
        }
      );

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to transmit intelligence.");
      }

      const recipientName =
        eligibleRecipients.find((r) => r.id === selectedRecipientId)?.codename ||
        "all squad operatives";

      setSuccessMessage(`Intelligence securely transmitted to ${recipientName}.`);
      if (onShared) {
        onShared(json.data);
      }
      setSelectedRecipientId("");
    } catch (err: any) {
      setError(err.message || "Failed to share evidence.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="rounded-lg border border-purple-800/40 bg-[#0d0d1a] p-4 text-xs">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Share2 className="h-4 w-4 text-purple-400" />
          <h4 className="font-semibold uppercase tracking-wider text-purple-200">
            Share Tactical Intelligence
          </h4>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-300 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <p className="text-[11px] text-slate-400 mb-3 leading-relaxed">
        Transmit this classified clue (<span className="text-cyan-300 font-mono">{clueCode}</span>)
        to fellow operatives in your active investigation unit.
      </p>

      {error && (
        <div className="mb-3 flex items-center gap-2 rounded bg-rose-950/40 border border-rose-800/50 p-2 text-rose-300">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMessage && (
        <div className="mb-3 flex items-center gap-2 rounded bg-emerald-950/40 border border-emerald-800/50 p-2 text-emerald-300">
          <Check className="h-4 w-4 shrink-0 text-emerald-400" />
          <span>{successMessage}</span>
        </div>
      )}

      {availableRecipients.length === 0 ? (
        <div className="rounded border border-slate-800/60 bg-slate-900/50 p-3 text-center text-slate-400 text-xs">
          <Users className="mx-auto h-5 w-5 text-slate-500 mb-1" />
          <p>All active unit operatives currently hold access to this evidence.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <div>
            <label className="block text-[11px] font-medium text-slate-300 mb-1">
              Select Recipient Operative
            </label>
            <select
              value={selectedRecipientId}
              onChange={(e) => setSelectedRecipientId(e.target.value)}
              className="w-full rounded border border-slate-800 bg-[#0c1222] px-3 py-2 text-xs text-slate-200 focus:border-purple-500/60 focus:outline-none focus:ring-1 focus:ring-purple-500/60"
            >
              <option value="">Select an active investigator...</option>
              {availableRecipients.map((rec) => (
                <option key={rec.id} value={rec.id}>
                  {rec.codename} ({rec.displayName})
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleShare}
            disabled={!selectedRecipientId || isSubmitting}
            className={`w-full flex items-center justify-center gap-2 rounded px-3 py-2 text-xs font-semibold transition-all ${
              selectedRecipientId && !isSubmitting
                ? "bg-purple-600/30 text-purple-200 border border-purple-500/50 hover:bg-purple-600/40 cursor-pointer shadow-sm shadow-purple-950"
                : "bg-slate-800/30 text-slate-500 border border-slate-800 cursor-not-allowed"
            }`}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Transmitting Intelligence...</span>
              </>
            ) : (
              <>
                <Share2 className="h-3.5 w-3.5" />
                <span>Authorize Transmission</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Transmission History */}
      {existingShares.length > 0 && (
        <div className="mt-4 pt-3 border-t border-slate-800/80">
          <h5 className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
            Transmission Log
          </h5>
          <div className="space-y-1.5">
            {existingShares.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between rounded bg-slate-900/60 px-2.5 py-1 text-[11px] border border-slate-800/50"
              >
                <div className="flex items-center gap-1.5 text-slate-300">
                  <span className="font-mono text-purple-300">{s.sharingPlayerCodename}</span>
                  <span className="text-slate-500">→</span>
                  <span className="font-mono text-slate-200">
                    {s.recipientPlayerCodename || "All"}
                  </span>
                </div>
                <span className="text-[10px] text-slate-500 font-mono">
                  {new Date(s.sharedAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
