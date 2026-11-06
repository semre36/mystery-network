"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { X, ShieldAlert, Loader2, Award } from "lucide-react";
import type { TeamMemberDto } from "@/modules/teams/types/team.types";

interface TransferLeadershipModalProps {
  isOpen: boolean;
  onClose: () => void;
  teamId: string;
  members: TeamMemberDto[];
  currentPlayerId: string;
}

export function TransferLeadershipModal({
  isOpen,
  onClose,
  teamId,
  members,
  currentPlayerId,
}: TransferLeadershipModalProps) {
  const router = useRouter();
  const eligibleMembers = members.filter(
    (m) => m.playerId !== currentPlayerId && m.status === "ACTIVE"
  );
  const [selectedPlayerId, setSelectedPlayerId] = useState(
    eligibleMembers.length > 0 ? eligibleMembers[0].playerId : ""
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlayerId) {
      setError("Please select an eligible operative to receive leadership.");
      return;
    }

    const confirmTransfer = window.confirm(
      "Are you certain you wish to relinquish Lead Investigator authority? You will be demoted to Detective."
    );
    if (!confirmTransfer) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/teams/${teamId}/transfer-leadership`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newLeaderPlayerId: selectedPlayerId }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to transfer leadership");
      }

      onClose();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Transfer failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-2xl bg-[#090e1a] border border-[#1e2a44] p-6 shadow-2xl text-slate-100">
        <div className="flex items-center justify-between pb-4 border-b border-[#18233a]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-950/80 border border-amber-800/80 flex items-center justify-center text-amber-400">
              <Award className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold font-sans tracking-tight text-white">
                Transfer Squad Command
              </h2>
              <p className="text-xs font-mono text-slate-400">Designate New Lead Investigator</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-xl bg-rose-950/40 border border-rose-800/50 flex items-center gap-2.5 text-xs text-rose-300 font-mono">
            <ShieldAlert className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {eligibleMembers.length === 0 ? (
          <div className="mt-4 p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-xs font-mono text-slate-400">
            No other active operatives in the squad roster to receive command.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-slate-300 mb-1.5">
                Select Successor Operative
              </label>
              <select
                value={selectedPlayerId}
                onChange={(e) => setSelectedPlayerId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#0d1527] border border-[#23314f] focus:border-amber-500 focus:outline-none text-white text-sm font-sans"
              >
                {eligibleMembers.map((m) => (
                  <option key={m.playerId} value={m.playerId}>
                    {m.codename} ({m.displayName}) — {m.role}
                  </option>
                ))}
              </select>
            </div>

            <div className="p-3.5 rounded-xl bg-amber-950/20 border border-amber-800/40 text-[11px] font-mono text-amber-300 leading-relaxed">
              Caution: Once transferred, Lead Investigator privileges (squad management, invite
              dispatch, member removal) pass to the selected operative.
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#18233a]">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="px-4 py-2 rounded-xl border border-[#23314f] bg-[#121a2c] hover:bg-[#1a253e] text-slate-300 text-xs font-mono transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || !selectedPlayerId}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-slate-950 font-mono text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50"
              >
                {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Confirm Transfer</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
