"use client";

import { useEffect, useState } from "react";
import {
  ScrollText,
  Search,
  Filter,
  ShieldCheck,
  ChevronDown,
  ChevronRight,
  Lock,
} from "lucide-react";

interface AuditLogItem {
  id: string;
  actorId: string | null;
  actorCodename: string | null;
  action: string;
  resourceType: string;
  resourceId: string | null;
  metadata: any;
  createdAt: string;
}

export function AdminAuditLogsView() {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [actionFilter, setActionFilter] = useState("");
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: page.toString(), limit: "25" });
      if (actionFilter) params.set("action", actionFilter);

      const res = await fetch(`/api/admin/audit-logs?${params.toString()}`);
      const json = await res.json();
      if (json.ok) {
        setLogs(json.data.logs);
        setTotalPages(json.data.totalPages);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, actionFilter]);

  const toggleExpand = (id: string) => {
    setExpandedLogId(expandedLogId === id ? null : id);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-mono tracking-tight text-slate-100 flex items-center gap-2">
            <ScrollText className="w-6 h-6 text-red-400" />
            Immutable Administrative Audit Ledger
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Tamper-resistant historical record of all administrative actions, role assignments, and
            moderation events.
          </p>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-950/40 border border-red-500/30 text-xs font-mono text-red-300">
          <Lock className="w-3.5 h-3.5 text-red-400" />
          Append-Only • Immutable
        </div>
      </div>

      {/* Filter */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
        <input
          type="text"
          value={actionFilter}
          onChange={(e) => {
            setActionFilter(e.target.value);
            setPage(1);
          }}
          placeholder="Filter by action name (e.g. USER_SUSPEND, ROLE_ASSIGN, CASE_UPDATE)..."
          className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-red-500 font-mono"
        />
      </div>

      {/* Logs Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="p-3.5 w-8"></th>
                <th className="p-3.5">Action</th>
                <th className="p-3.5">Actor</th>
                <th className="p-3.5">Target Resource</th>
                <th className="p-3.5">Resource ID</th>
                <th className="p-3.5">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">
                    Querying cryptographic audit index...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">
                    No administrative audit events found.
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const isExpanded = expandedLogId === log.id;
                  return (
                    <tbody key={log.id} className="border-b border-slate-800/60">
                      <tr
                        onClick={() => toggleExpand(log.id)}
                        className="hover:bg-slate-800/40 transition-colors cursor-pointer"
                      >
                        <td className="p-3.5 text-slate-500">
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4 text-slate-300" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-slate-500" />
                          )}
                        </td>
                        <td className="p-3.5">
                          <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-200 font-bold">
                            {log.action}
                          </span>
                        </td>
                        <td className="p-3.5 text-slate-300 font-bold">
                          {log.actorCodename || "SYSTEM_BOOTSTRAP"}
                        </td>
                        <td className="p-3.5 text-slate-400">
                          <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-400">
                            {log.resourceType}
                          </span>
                        </td>
                        <td className="p-3.5 text-slate-500 truncate max-w-[120px]">
                          {log.resourceId || "—"}
                        </td>
                        <td className="p-3.5 text-slate-400">
                          {new Date(log.createdAt).toLocaleString()}
                        </td>
                      </tr>

                      {/* Expandable JSON Metadata Inspector */}
                      {isExpanded && (
                        <tr className="bg-slate-950/80">
                          <td colSpan={6} className="p-4 border-t border-slate-800/60">
                            <div className="text-[11px] font-bold text-slate-400 mb-2 uppercase tracking-wider flex items-center gap-2">
                              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                              Sanitized Mutation Metadata (Redacted Secrets)
                            </div>
                            <pre className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 overflow-x-auto text-[11px]">
                              {JSON.stringify(log.metadata, null, 2)}
                            </pre>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

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
