"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  X,
  UserPlus,
  Copy,
  Check,
  Loader2,
  Trash2,
  Clock,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";
import type { TeamInvitationDto } from "@/modules/teams/types/team.types";

interface InviteMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  teamId: string;
  teamName: string;
}

export function InviteMemberModal({ isOpen, onClose, teamId, teamName }: InviteMemberModalProps) {
  const [expiresInDays, setExpiresInDays] = useState(7);
  const [createdInviteLink, setCreatedInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [invitations, setInvitations] = useState<TeamInvitationDto[]>([]);
  const [fetchingList, setFetchingList] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    if (isOpen) {
      fetch(`/api/teams/${teamId}/invitations`)
        .then((res) => res.json())
        .then((json) => {
          if (!ignore && json.data) {
            setInvitations(json.data);
          }
        })
        .catch(() => {});
    }
    return () => {
      ignore = true;
    };
  }, [isOpen, teamId]);

  const refreshInvitations = () => {
    fetch(`/api/teams/${teamId}/invitations`)
      .then((res) => res.json())
      .then((json) => {
        if (json.data) {
          setInvitations(json.data);
        }
      })
      .catch(() => {});
  };

  const handleClose = () => {
    setCreatedInviteLink(null);
    setCopied(false);
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  const handleGenerateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setCopied(false);

    try {
      const res = await fetch(`/api/teams/${teamId}/invitations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expiresInDays }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to generate squad invitation");
      }

      const rawToken = json.data.rawToken;
      const fullUrl = `${window.location.origin}/invitations/${rawToken}`;
      setCreatedInviteLink(fullUrl);
      refreshInvitations();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!createdInviteLink) return;
    navigator.clipboard.writeText(createdInviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleRevoke = async (invitationId: string) => {
    setRevokingId(invitationId);
    setError(null);

    try {
      const res = await fetch(`/api/teams/${teamId}/invitations/${invitationId}`, {
        method: "DELETE",
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to revoke invitation");
      }

      refreshInvitations();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Revocation failed");
    } finally {
      setRevokingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl rounded-2xl bg-[#090e1a] border border-[#1e2a44] p-6 shadow-2xl text-slate-100 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#18233a]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-950/80 border border-cyan-800/80 flex items-center justify-center text-cyan-400">
              <UserPlus className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold font-sans tracking-tight text-white">
                Dispatch Squad Invitation
              </h2>
              <p className="text-xs font-mono text-slate-400">Unit: {teamName}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error notification */}
        {error && (
          <div className="mt-4 p-3 rounded-xl bg-rose-950/40 border border-rose-800/50 flex items-center gap-2.5 text-xs text-rose-300 font-mono">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Generation Form */}
        <form onSubmit={handleGenerateInvite} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-slate-300 mb-1.5">
              Access Token Validity Duration
            </label>
            <select
              value={expiresInDays}
              onChange={(e) => setExpiresInDays(Number(e.target.value))}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#0d1527] border border-[#23314f] focus:border-cyan-500 focus:outline-none text-white text-sm font-sans"
            >
              <option value={1}>1 Day (24 Hours)</option>
              <option value={3}>3 Days</option>
              <option value={7}>7 Days (Standard)</option>
              <option value={14}>14 Days</option>
              <option value={30}>30 Days (Maximum)</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-mono text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50 shadow-md shadow-cyan-950"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
            ) : (
              <ShieldCheck className="w-4 h-4 text-slate-950" />
            )}
            <span>Generate Secure Dispatch Token</span>
          </button>
        </form>

        {/* Generated Link Display */}
        {createdInviteLink && (
          <div className="mt-5 p-4 rounded-xl bg-cyan-950/30 border border-cyan-800/50 animate-in fade-in duration-300">
            <p className="text-xs font-mono text-cyan-300 mb-2 font-semibold">
              Secure Commission Link Generated:
            </p>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={createdInviteLink}
                className="w-full px-3 py-2 rounded-lg bg-[#070d18] border border-cyan-900/60 font-mono text-xs text-slate-200 select-all"
              />
              <button
                type="button"
                onClick={handleCopy}
                className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-mono text-xs font-bold transition-colors"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? "Copied" : "Copy"}</span>
              </button>
            </div>
            <p className="mt-2 text-[11px] font-mono text-slate-400">
              Share this link securely with the operative. Each token can be accepted once.
            </p>
          </div>
        )}

        {/* Existing Invitations List */}
        <div className="mt-6 pt-5 border-t border-[#18233a]">
          <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400 mb-3 flex items-center justify-between">
            <span>Dispatched Commission Tokens</span>
            {fetchingList && <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />}
          </h3>

          {invitations.length === 0 ? (
            <p className="text-xs font-mono text-slate-500 italic">
              No previous invitations found for this squad.
            </p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {invitations.map((inv) => {
                const isPending = inv.status === "PENDING";
                const isExpired = new Date(inv.expiresAt) <= new Date();

                return (
                  <div
                    key={inv.id}
                    className="flex items-center justify-between gap-3 p-3 rounded-xl bg-[#0c1322] border border-[#1a253a] text-xs font-mono"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            inv.status === "ACCEPTED"
                              ? "bg-emerald-950/80 text-emerald-300 border border-emerald-800/60"
                              : inv.status === "REVOKED"
                                ? "bg-rose-950/80 text-rose-300 border border-rose-800/60"
                                : isExpired
                                  ? "bg-slate-900 text-slate-500 border border-slate-700"
                                  : "bg-cyan-950/80 text-cyan-300 border border-cyan-800/60"
                          }`}
                        >
                          {isExpired && isPending ? "EXPIRED" : inv.status}
                        </span>
                        <span className="text-slate-400">
                          {inv.invitedPlayerCodename
                            ? `For: ${inv.invitedPlayerCodename}`
                            : "Open Directive"}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                        <Clock className="w-3 h-3" />
                        <span>Expires {new Date(inv.expiresAt).toLocaleDateString()}</span>
                      </div>
                    </div>

                    {isPending && !isExpired && (
                      <button
                        type="button"
                        onClick={() => handleRevoke(inv.id)}
                        disabled={revokingId === inv.id}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-rose-950/40 hover:bg-rose-900/50 border border-rose-800/50 text-rose-300 text-[11px] transition-colors disabled:opacity-50"
                      >
                        {revokingId === inv.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Trash2 className="w-3 h-3" />
                        )}
                        <span>Revoke</span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
