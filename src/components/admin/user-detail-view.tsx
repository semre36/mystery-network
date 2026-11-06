"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users,
  ArrowLeft,
  ShieldCheck,
  AlertTriangle,
  Ban,
  CheckCircle,
  Award,
  Briefcase,
  ScrollText,
  Clock,
  RefreshCw,
  Coins,
  ShieldAlert,
} from "lucide-react";
import { UserStatus } from "@prisma/client";

interface UserDetailViewProps {
  userId: string;
}

export function AdminUserDetailView({ userId }: UserDetailViewProps) {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDetail = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/admin/users/${userId}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `HTTP error ${res.status}`);
      }
      const json = await res.json();
      setData(json.data.user);
    } catch (err: any) {
      setError(err.message || "Failed to load operative dossier");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [userId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-3">
        <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
        <span className="text-xs font-mono text-slate-400">PULLING OPERATIVE ARCHIVE...</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 rounded-lg bg-red-950/20 border border-red-800/40 text-red-300 space-y-3">
        <div className="text-sm font-semibold">DOSSIER LOOKUP FAILED</div>
        <p className="text-xs font-mono text-red-400">{error || "User record not found"}</p>
        <Link
          href="/admin/users"
          className="inline-flex items-center gap-2 text-xs text-blue-400 hover:text-blue-300 font-mono"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Operatives Directory
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Actions */}
      <div className="flex items-center justify-between">
        <Link
          href="/admin/users"
          className="inline-flex items-center gap-1.5 text-xs font-mono text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Operatives</span>
        </Link>
      </div>

      {/* Main Dossier Header */}
      <div className="p-6 rounded-lg bg-slate-900 border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-white font-mono">
              {data.profile?.codename || "UNREGISTERED"}
            </h1>
            {data.status === UserStatus.ACTIVE && (
              <span className="px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-emerald-950/60 text-emerald-400 border border-emerald-800/40">
                ACTIVE CLEARANCE
              </span>
            )}
            {data.status === UserStatus.SUSPENDED && (
              <span className="px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-amber-950/60 text-amber-400 border border-amber-800/40 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> SUSPENDED
              </span>
            )}
            {data.status === UserStatus.BANNED && (
              <span className="px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-red-950/60 text-red-400 border border-red-800/40 flex items-center gap-1">
                <Ban className="w-3 h-3" /> BANNED
              </span>
            )}
          </div>
          <div className="text-xs text-slate-400 flex flex-wrap items-center gap-4">
            <span>Name: {data.profile?.displayName || "N/A"}</span>
            <span>•</span>
            <span className="font-mono">Telegram ID: {data.telegramId}</span>
            {data.telegramUsername && (
              <>
                <span>•</span>
                <span className="font-mono text-blue-400">@{data.telegramUsername}</span>
              </>
            )}
          </div>
          {data.suspensionReason && (
            <div className="p-2.5 rounded bg-amber-950/30 border border-amber-800/40 text-xs font-mono text-amber-300">
              Moderation Reason: {data.suspensionReason}
            </div>
          )}
        </div>

        {/* Level & XP Box */}
        <div className="p-4 rounded-md bg-slate-950 border border-slate-800 flex items-center gap-6 font-mono">
          <div>
            <div className="text-[10px] text-slate-500 uppercase">Clearance</div>
            <div className="text-xl font-bold text-blue-400">Lvl {data.profile?.level || 1}</div>
          </div>
          <div className="border-l border-slate-800 pl-6">
            <div className="text-[10px] text-slate-500 uppercase">Total Score</div>
            <div className="text-xl font-bold text-amber-400">
              {data.profile?.xp.toLocaleString() || 0} XP
            </div>
          </div>
          <div className="border-l border-slate-800 pl-6">
            <div className="text-[10px] text-slate-500 uppercase">Solved Cases</div>
            <div className="text-xl font-bold text-emerald-400">{data.solvedCasesCount || 0}</div>
          </div>
        </div>
      </div>

      {/* Grid: Investigations & Accolades */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Investigations */}
        <div className="p-5 rounded-lg bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-white font-mono uppercase">
            <Briefcase className="w-4 h-4 text-amber-400" />
            <span>Investigation Deployments</span>
          </div>
          {data.investigations.length === 0 ? (
            <div className="py-6 text-center text-xs font-mono text-slate-500">
              No investigation sessions initiated.
            </div>
          ) : (
            <div className="divide-y divide-slate-800/80">
              {data.investigations.map((inv: any) => (
                <div key={inv.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-semibold text-slate-200">{inv.caseTitle}</div>
                    <div className="text-[11px] font-mono text-slate-500">
                      {inv.caseCode} • {inv.playMode}
                    </div>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                      inv.status === "SOLVED"
                        ? "bg-emerald-950/60 text-emerald-400 border border-emerald-800/40"
                        : inv.status === "IN_PROGRESS"
                          ? "bg-blue-950/60 text-blue-400 border border-blue-800/40"
                          : "bg-slate-800 text-slate-400"
                    }`}
                  >
                    {inv.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Unlocked Achievements */}
        <div className="p-5 rounded-lg bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-white font-mono uppercase">
            <Award className="w-4 h-4 text-purple-400" />
            <span>Unlocked Accolades ({data.achievements.length})</span>
          </div>
          {data.achievements.length === 0 ? (
            <div className="py-6 text-center text-xs font-mono text-slate-500">
              No milestone achievements earned yet.
            </div>
          ) : (
            <div className="divide-y divide-slate-800/80">
              {data.achievements.map((ach: any) => (
                <div key={ach.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-semibold text-slate-200">{ach.title}</div>
                    <div className="text-[11px] text-slate-400">{ach.description}</div>
                  </div>
                  <div className="text-[10px] font-mono text-slate-500">
                    {new Date(ach.unlockedAt).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
