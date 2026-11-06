"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users,
  Compass,
  Briefcase,
  Eye,
  ScrollText,
  Search,
  ArrowUpRight,
  ShieldAlert,
  Puzzle,
  FileText,
  Clock,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import type { AdminDashboardMetricsDto } from "@/modules/administration/types/admin.types";

export function AdminDashboardView() {
  const [metrics, setMetrics] = useState<AdminDashboardMetricsDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/admin/dashboard");
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `HTTP error ${res.status}`);
      }
      const data = await res.json();
      setMetrics(data.data.metrics);
    } catch (err: any) {
      setError(err.message || "Failed to load dashboard metrics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-3">
        <RefreshCw className="w-6 h-6 animate-spin text-red-500" />
        <span className="text-xs font-mono text-slate-400">CONNECTING TO HQ ARCHIVES...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 rounded-lg bg-red-950/20 border border-red-800/40 text-red-300 space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <AlertCircle className="w-5 h-5 text-red-400" />
          <span>ACCESS OR TELEMETRY ERROR</span>
        </div>
        <p className="text-xs text-red-400 font-mono">{error}</p>
        <button
          onClick={fetchMetrics}
          className="px-3 py-1.5 rounded bg-red-900/60 hover:bg-red-900 text-xs font-mono font-medium transition-colors"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page Title & Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-red-400 uppercase tracking-wider mb-1">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
            LIVE NETWORK STATUS
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Central Command Overview</h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time platform metrics, active investigation sessions, and administrative audit
            feed.
          </p>
        </div>

        <button
          onClick={fetchMetrics}
          className="self-start sm:self-auto flex items-center gap-2 px-3 py-2 rounded-md bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 transition-colors border border-slate-700/60"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Telemetry</span>
        </button>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-lg bg-slate-900 border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Registered Operatives</span>
            <Users className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white">
            {metrics?.totalPlayers.toLocaleString() || "0"}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            <span className="text-emerald-400 font-mono font-bold">
              {metrics?.activePlayers30d.toLocaleString()}
            </span>{" "}
            active in last 30d
          </div>
        </div>

        <div className="p-4 rounded-lg bg-slate-900 border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Published Cases</span>
            <Briefcase className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white">
            {metrics?.publishedCases || 0}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Across <span className="text-slate-200">{metrics?.publishedCampaigns || 0}</span>{" "}
            campaigns
          </div>
        </div>

        <div className="p-4 rounded-lg bg-slate-900 border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Active Investigations</span>
            <Eye className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white">
            {metrics?.activeInvestigations || 0}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            <span className="text-slate-200">{metrics?.completedInvestigations || 0}</span> resolved
            / closed
          </div>
        </div>

        <div className="p-4 rounded-lg bg-slate-900 border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Forensic Intelligence</span>
            <Puzzle className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white">{metrics?.totalClues || 0}</div>
          <div className="text-[11px] text-slate-400 mt-1">
            Clues & <span className="text-slate-200">{metrics?.totalPuzzles || 0}</span> ciphers
          </div>
        </div>
      </div>

      {/* Quick Action Navigation */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          href="/admin/cases"
          className="p-5 rounded-lg bg-slate-900/60 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all group"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-semibold text-white group-hover:text-red-400 transition-colors">
              Case Authoring CMS
            </div>
            <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-red-400 transition-colors" />
          </div>
          <p className="text-xs text-slate-400">
            Define new mystery scenarios, acts, forensic clues, and configure secret deduction
            criteria.
          </p>
        </Link>

        <Link
          href="/admin/users"
          className="p-5 rounded-lg bg-slate-900/60 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all group"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-semibold text-white group-hover:text-blue-400 transition-colors">
              Operative Moderation
            </div>
            <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-blue-400 transition-colors" />
          </div>
          <p className="text-xs text-slate-400">
            Inspect player profiles, monitor investigation progress, and execute account suspensions
            or bans.
          </p>
        </Link>

        <Link
          href="/admin/audit-logs"
          className="p-5 rounded-lg bg-slate-900/60 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all group"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-semibold text-white group-hover:text-emerald-400 transition-colors">
              Security Audit Trail
            </div>
            <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 transition-colors" />
          </div>
          <p className="text-xs text-slate-400">
            Inspect auditable records of all administrative mutations, role grants, and content
            releases.
          </p>
        </Link>
      </div>

      {/* Recent Administrative Activity Log */}
      <div className="p-6 rounded-lg bg-slate-900 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ScrollText className="w-4 h-4 text-red-400" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
              Recent Administrative Actions
            </h2>
          </div>
          <Link
            href="/admin/audit-logs"
            className="text-xs text-red-400 hover:text-red-300 font-medium font-mono"
          >
            View Full Audit History &rarr;
          </Link>
        </div>

        {!metrics?.recentAuditLogs || metrics.recentAuditLogs.length === 0 ? (
          <div className="py-8 text-center text-xs font-mono text-slate-500">
            No administrative events recorded yet.
          </div>
        ) : (
          <div className="divide-y divide-slate-800/80">
            {metrics.recentAuditLogs.map((log) => (
              <div key={log.id} className="py-3 flex items-start justify-between gap-4 text-xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-red-400">{log.action}</span>
                    <span className="text-slate-500">•</span>
                    <span className="text-slate-300 font-medium">{log.resourceType}</span>
                    {log.resourceId && (
                      <span className="text-[11px] font-mono text-slate-500">
                        ({log.resourceId.slice(0, 8)}...)
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    By <span className="text-slate-200">{log.actorDisplayName}</span>
                  </div>
                </div>
                <div className="text-[11px] font-mono text-slate-500 whitespace-nowrap">
                  {new Date(log.createdAt).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
