"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Users,
  ShieldCheck,
  Clock,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  XCircle,
  Crown,
} from "lucide-react";
import type { InvitationPreviewDto } from "@/modules/teams/types/team.types";

interface InvitationLandingClientProps {
  token: string;
  preview: InvitationPreviewDto;
}

export function InvitationLandingClient({ token, preview }: InvitationLandingClientProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const isInvalid = preview.isExpired || preview.status !== "PENDING";

  const handleAccept = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/invitations/${token}/accept`, {
        method: "POST",
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to accept squad invitation");
      }

      setSuccessMessage(`Successfully enrolled in ${json.data.teamName}. Redirecting...`);
      setTimeout(() => {
        router.push(`/teams/${json.data.teamId}`);
        router.refresh();
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Acceptance failed");
      setLoading(false);
    }
  };

  const handleDecline = async () => {
    const confirm = window.confirm("Are you sure you wish to decline this squad commission?");
    if (!confirm) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/invitations/${token}/decline`, {
        method: "POST",
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to decline invitation");
      }

      setSuccessMessage("Commission declined. Redirecting to headquarters...");
      setTimeout(() => {
        router.push("/teams");
        router.refresh();
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Decline failed");
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto py-8 px-4 space-y-6">
      {/* Commission Directive Card */}
      <div className="rounded-2xl bg-gradient-to-br from-[#0c1424] via-[#09101d] to-[#070b16] border border-[#1e2a44] p-8 shadow-2xl text-center">
        <div className="w-14 h-14 rounded-2xl bg-cyan-950/80 border border-cyan-800/80 flex items-center justify-center mx-auto text-cyan-400 mb-5 shadow-lg shadow-cyan-950">
          <Users className="w-7 h-7" />
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-950/60 border border-cyan-800/60 text-cyan-300 font-mono text-[11px] uppercase tracking-wider mb-3">
          <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
          <span>Squad Commission Directive</span>
        </div>

        <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight font-sans mb-3">
          {preview.teamName}
        </h1>

        {preview.description && (
          <p className="text-xs md:text-sm text-slate-300 max-w-md mx-auto mb-6 leading-relaxed font-sans">
            {preview.description}
          </p>
        )}

        {/* Squad Meta Metrics */}
        <div className="grid grid-cols-2 gap-3 p-4 rounded-xl bg-[#090f1d] border border-[#1a253a] text-left mb-6 font-mono text-xs">
          <div className="space-y-1">
            <span className="text-[11px] text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <Crown className="w-3 h-3 text-amber-400" />
              <span>Squad Leader</span>
            </span>
            <p className="font-bold text-slate-200">{preview.leaderCodename}</p>
          </div>

          <div className="space-y-1">
            <span className="text-[11px] text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <Users className="w-3 h-3 text-cyan-400" />
              <span>Active Operatives</span>
            </span>
            <p className="font-bold text-slate-200">{preview.memberCount} Deployed</p>
          </div>
        </div>

        {/* Expiration or Status Alert */}
        {isInvalid ? (
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-700 text-slate-400 text-xs font-mono mb-6 flex items-center justify-center gap-2">
            <XCircle className="w-4 h-4 text-rose-400" />
            <span>This commission token is no longer valid ({preview.status}).</span>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-1.5 text-xs font-mono text-slate-400 mb-6">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <span>Expires {new Date(preview.expiresAt).toLocaleDateString()}</span>
          </div>
        )}

        {/* Error notification */}
        {error && (
          <div className="mb-6 p-3.5 rounded-xl bg-rose-950/40 border border-rose-800/50 flex items-center gap-2.5 text-xs text-rose-300 font-mono text-left">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Success notification */}
        {successMessage && (
          <div className="mb-6 p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-800/50 flex items-center gap-2.5 text-xs text-emerald-300 font-mono text-left">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Action Buttons */}
        {isInvalid ? (
          <Link
            href="/teams"
            className="inline-flex items-center justify-center gap-2 w-full px-5 py-3 rounded-xl bg-[#121a2c] hover:bg-[#1a253e] border border-[#23314f] text-slate-200 font-mono text-xs font-bold uppercase tracking-wider transition-colors"
          >
            <span>Return to Squads Headquarters</span>
          </Link>
        ) : (
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              type="button"
              onClick={handleDecline}
              disabled={loading}
              className="w-full sm:w-auto px-5 py-3 rounded-xl border border-[#23314f] bg-[#121a2c] hover:bg-[#1a253e] text-slate-400 hover:text-slate-200 font-mono text-xs uppercase tracking-wider transition-colors disabled:opacity-50"
            >
              Decline Commission
            </button>
            <button
              type="button"
              onClick={handleAccept}
              disabled={loading}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-mono text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50 shadow-lg shadow-cyan-950"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin text-slate-950" />}
              <span>Accept Commission & Deploy</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
