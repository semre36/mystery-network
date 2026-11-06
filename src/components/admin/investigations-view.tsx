"use client";

import { useEffect, useState } from "react";
import {
  Eye,
  Search,
  Filter,
  Clock,
  CheckCircle2,
  AlertCircle,
  PauseCircle,
  Users,
  Compass,
} from "lucide-react";

interface InvestigationItem {
  id: string;
  caseCode: string;
  caseTitle: string;
  status: "IN_PROGRESS" | "PAUSED" | "SOLVED" | "ABANDONED";
  playMode: "SOLO" | "COOPERATIVE";
  startedAt: string;
  completedAt: string | null;
  participantsCount: number;
  participants: Array<{
    id: string;
    codename: string;
    displayName: string | null;
    role: string;
  }>;
}

export function AdminInvestigationsView() {
  const [investigations, setInvestigations] = useState<InvestigationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [playModeFilter, setPlayModeFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchInvestigations = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: page.toString(), limit: "20" });
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      if (playModeFilter !== "ALL") params.set("playMode", playModeFilter);

      const res = await fetch(`/api/admin/investigations?${params.toString()}`);
      const json = await res.json();
      if (json.ok) {
        setInvestigations(json.data.investigations);
        setTotalPages(json.data.totalPages);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvestigations();
  }, [page, statusFilter, playModeFilter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-mono tracking-tight text-slate-100 flex items-center gap-2">
            <Eye className="w-6 h-6 text-blue-400" />
            Live Investigation Monitor
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Real-time telemetry of detective syndicate sessions, chapter unlocks, and case
            resolutions.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-mono text-slate-400 mb-1">Session Status</label>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-blue-500 font-mono"
          >
            <option value="ALL">All Lifecycle States</option>
            <option value="IN_PROGRESS">Active In Progress</option>
            <option value="PAUSED">Paused</option>
            <option value="SOLVED">Solved & Concluded</option>
            <option value="ABANDONED">Abandoned</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-mono text-slate-400 mb-1">Operational Mode</label>
          <select
            value={playModeFilter}
            onChange={(e) => {
              setPlayModeFilter(e.target.value);
              setPage(1);
            }}
            className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-blue-500 font-mono"
          >
            <option value="ALL">All Play Modes</option>
            <option value="SOLO">Solo Detective</option>
            <option value="COOPERATIVE">Multiplayer Cooperative Squad</option>
          </select>
        </div>
      </div>

      {/* Investigations Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="p-3.5">Session ID / Case</th>
                <th className="p-3.5">Mode</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5">Operatives</th>
                <th className="p-3.5">Started At</th>
                <th className="p-3.5">Concluded At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">
                    Scanning active telemetry feeds...
                  </td>
                </tr>
              ) : investigations.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">
                    No investigation sessions match your query.
                  </td>
                </tr>
              ) : (
                investigations.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-3.5">
                      <div className="font-bold text-slate-200 font-sans">{inv.caseTitle}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        {inv.caseCode} • {inv.id.slice(0, 8)}
                      </div>
                    </td>
                    <td className="p-3.5">
                      <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300">
                        {inv.playMode}
                      </span>
                    </td>
                    <td className="p-3.5">
                      <span
                        className={`px-2 py-0.5 rounded border uppercase text-[10px] font-bold ${
                          inv.status === "SOLVED"
                            ? "bg-emerald-950/60 border-emerald-500/40 text-emerald-400"
                            : inv.status === "IN_PROGRESS"
                              ? "bg-blue-950/60 border-blue-500/40 text-blue-400"
                              : inv.status === "PAUSED"
                                ? "bg-amber-950/60 border-amber-500/40 text-amber-400"
                                : "bg-slate-800 border-slate-700 text-slate-400"
                        }`}
                      >
                        {inv.status}
                      </span>
                    </td>
                    <td className="p-3.5">
                      <div className="text-slate-300 font-bold">
                        {inv.participantsCount} Agent(s)
                      </div>
                      <div className="text-[10px] text-slate-500 truncate max-w-[160px]">
                        {inv.participants.map((p) => p.codename).join(", ")}
                      </div>
                    </td>
                    <td className="p-3.5 text-slate-400">
                      {new Date(inv.startedAt).toLocaleString()}
                    </td>
                    <td className="p-3.5 text-slate-400">
                      {inv.completedAt ? new Date(inv.completedAt).toLocaleString() : "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-800 flex items-center justify-between text-xs font-mono text-slate-400">
            <div>
              Page {page} of {totalPages}
            </div>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 transition-colors"
              >
                Previous
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
                className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
