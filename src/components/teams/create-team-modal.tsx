"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { X, Users, Loader2, ShieldAlert } from "lucide-react";

interface CreateTeamModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateTeamModal({ isOpen, onClose }: CreateTeamModalProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (trimmedName.length < 3) {
      setError("Squad callsign must be at least 3 characters.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmedName,
          description: description.trim() || undefined,
          avatarUrl: avatarUrl.trim() || undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to commission squad");
      }

      onClose();
      router.push(`/teams/${json.data.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Commission failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-2xl bg-[#090e1a] border border-[#1e2a44] p-6 shadow-2xl text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#18233a]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-950/80 border border-cyan-800/80 flex items-center justify-center text-cyan-400">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold font-sans tracking-tight text-white">
                Commission Operative Squad
              </h2>
              <p className="text-xs font-mono text-slate-400">
                Establish an authorized multi-investigator tactical unit
              </p>
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

        {/* Error notification */}
        {error && (
          <div className="mt-4 p-3 rounded-xl bg-rose-950/40 border border-rose-800/50 flex items-center gap-2.5 text-xs text-rose-300 font-mono">
            <ShieldAlert className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Commission Form */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-slate-300 mb-1.5">
              Squad Callsign / Unit Name <span className="text-cyan-400">*</span>
            </label>
            <input
              type="text"
              required
              minLength={3}
              maxLength={50}
              placeholder="e.g. Midnight Vanguard, Chimera Taskforce"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#0d1527] border border-[#23314f] focus:border-cyan-500 focus:outline-none text-white text-sm font-sans placeholder:text-slate-600 transition-colors"
            />
            <p className="mt-1 text-[11px] font-mono text-slate-500">
              Between 3 and 50 characters. This callsign is visible to invited operatives.
            </p>
          </div>

          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-slate-300 mb-1.5">
              Unit Mission Brief / Description
            </label>
            <textarea
              rows={3}
              maxLength={500}
              placeholder="Operational objectives, directive focus, or squad rules..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#0d1527] border border-[#23314f] focus:border-cyan-500 focus:outline-none text-white text-sm font-sans placeholder:text-slate-600 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-slate-300 mb-1.5">
              Unit Insignia URL (Optional)
            </label>
            <input
              type="url"
              placeholder="https://..."
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#0d1527] border border-[#23314f] focus:border-cyan-500 focus:outline-none text-white text-sm font-sans placeholder:text-slate-600 transition-colors"
            />
          </div>

          {/* Action Buttons */}
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
              disabled={submitting || name.trim().length < 3}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-mono text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50 shadow-lg shadow-cyan-950"
            >
              {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Establish Unit</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
