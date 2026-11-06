"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users,
  Search,
  Filter,
  ShieldAlert,
  ShieldCheck,
  Ban,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import type { SafeAdminUserDto } from "@/modules/administration/types/admin.types";
import { UserStatus } from "@prisma/client";

export function AdminUsersView() {
  const [users, setUsers] = useState<SafeAdminUserDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Moderation action modal state
  const [modalAction, setModalAction] = useState<"suspend" | "ban" | "restore" | null>(null);
  const [targetUser, setTargetUser] = useState<SafeAdminUserDto | null>(null);
  const [actionReason, setActionReason] = useState("");
  const [submittingAction, setSubmittingAction] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      params.set("page", page.toString());
      params.set("limit", "15");
      if (search.trim()) params.set("search", search.trim());
      if (statusFilter) params.set("status", statusFilter);

      const res = await fetch(`/api/admin/users?${params.toString()}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `HTTP error ${res.status}`);
      }

      const data = await res.json();
      setUsers(data.data.users);
      setTotalPages(data.data.totalPages);
      setTotal(data.data.total);
    } catch (err: any) {
      setError(err.message || "Failed to load players");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [page, statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchUsers();
  };

  const handleModerationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUser || !modalAction) return;

    try {
      setSubmittingAction(true);
      setActionFeedback(null);

      const endpoint = `/api/admin/users/${targetUser.id}/${modalAction}`;
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: actionReason.trim() }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Failed to ${modalAction} user`);
      }

      // Close modal and refresh list
      setModalAction(null);
      setTargetUser(null);
      setActionReason("");
      await fetchUsers();
    } catch (err: any) {
      setActionFeedback(err.message);
    } finally {
      setSubmittingAction(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-blue-400" />
            <span>Operative Directory & Moderation</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Search registered investigators, review standing clearance, and execute security
            actions.
          </p>
        </div>
        <div className="text-xs font-mono text-slate-400">
          Total Operatives: <span className="font-bold text-white">{total}</span>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="p-4 rounded-lg bg-slate-900 border border-slate-800 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <form onSubmit={handleSearchSubmit} className="flex-1 flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search codename, Telegram username, or ID..."
              className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-md text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-md text-xs font-medium transition-colors"
          >
            Search
          </button>
        </form>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-500" />
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="bg-slate-950 border border-slate-800 rounded-md px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-blue-500 font-mono"
          >
            <option value="">All Account Statuses</option>
            <option value={UserStatus.ACTIVE}>Active</option>
            <option value={UserStatus.SUSPENDED}>Suspended</option>
            <option value={UserStatus.BANNED}>Banned</option>
          </select>
          <button
            onClick={() => {
              setSearch("");
              setStatusFilter("");
              setPage(1);
              fetchUsers();
            }}
            className="p-2 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
            title="Reset Filters"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Users Table */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 space-y-2">
          <RefreshCw className="w-5 h-5 animate-spin text-blue-400" />
          <span className="text-xs font-mono text-slate-400">Loading directory records...</span>
        </div>
      ) : error ? (
        <div className="p-4 rounded bg-red-950/20 border border-red-800/40 text-red-300 text-xs font-mono">
          {error}
        </div>
      ) : users.length === 0 ? (
        <div className="p-8 text-center bg-slate-900 rounded-lg border border-slate-800 text-slate-400 text-xs font-mono">
          No operatives matched the current search criteria.
        </div>
      ) : (
        <div className="rounded-lg bg-slate-900 border border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 border-b border-slate-800 text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Operative</th>
                  <th className="px-4 py-3">Telegram ID</th>
                  <th className="px-4 py-3">Rank / Level</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Admin Roles</th>
                  <th className="px-4 py-3">Registered</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {users.map((u) => {
                  const isSuspended = u.status === UserStatus.SUSPENDED;
                  const isBanned = u.status === UserStatus.BANNED;
                  const isActive = u.status === UserStatus.ACTIVE;

                  return (
                    <tr key={u.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/users/${u.id}`}
                          className="font-semibold text-slate-200 hover:text-blue-400 flex items-center gap-1.5"
                        >
                          <span>{u.profile?.codename || "UNREGISTERED"}</span>
                          <ExternalLink className="w-3 h-3 text-slate-500" />
                        </Link>
                        {u.profile?.displayName && (
                          <div className="text-[11px] text-slate-400">{u.profile.displayName}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-300">
                        {u.telegramId}
                        {u.telegramUsername && (
                          <div className="text-[11px] text-slate-500">@{u.telegramUsername}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono">
                        <span className="text-blue-400 font-bold">Lvl {u.profile?.level || 1}</span>
                        <div className="text-[11px] text-slate-400">
                          {u.profile?.xp.toLocaleString() || 0} XP
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {isActive && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-emerald-950/60 text-emerald-400 border border-emerald-800/40">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            ACTIVE
                          </span>
                        )}
                        {isSuspended && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-amber-950/60 text-amber-400 border border-amber-800/40">
                            <AlertTriangle className="w-3 h-3" />
                            SUSPENDED
                          </span>
                        )}
                        {isBanned && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-red-950/60 text-red-400 border border-red-800/40">
                            <Ban className="w-3 h-3" />
                            BANNED
                          </span>
                        )}
                        {u.suspensionReason && (
                          <div
                            className="text-[10px] text-slate-400 truncate max-w-[140px] mt-0.5"
                            title={u.suspensionReason}
                          >
                            Reason: {u.suspensionReason}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {u.roles.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {u.roles.map((r) => (
                              <span
                                key={r}
                                className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-red-950/40 text-red-400 border border-red-800/40 uppercase"
                              >
                                {r}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-500 font-mono text-[11px]">Player</span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-400 text-[11px]">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isActive && (
                            <>
                              <button
                                onClick={() => {
                                  setTargetUser(u);
                                  setModalAction("suspend");
                                  setActionReason("");
                                }}
                                className="px-2 py-1 rounded bg-slate-800 hover:bg-amber-950 hover:text-amber-300 text-[11px] text-slate-300 border border-slate-700/60 transition-colors"
                              >
                                Suspend
                              </button>
                              <button
                                onClick={() => {
                                  setTargetUser(u);
                                  setModalAction("ban");
                                  setActionReason("");
                                }}
                                className="px-2 py-1 rounded bg-slate-800 hover:bg-red-950 hover:text-red-300 text-[11px] text-slate-300 border border-slate-700/60 transition-colors"
                              >
                                Ban
                              </button>
                            </>
                          )}
                          {(isSuspended || isBanned) && (
                            <button
                              onClick={() => {
                                setTargetUser(u);
                                setModalAction("restore");
                                setActionReason("");
                              }}
                              className="px-2.5 py-1 rounded bg-emerald-950/60 hover:bg-emerald-900 text-[11px] text-emerald-300 border border-emerald-800/40 transition-colors"
                            >
                              Restore
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Bar */}
          <div className="p-3 bg-slate-950/60 border-t border-slate-800 flex items-center justify-between text-xs font-mono text-slate-400">
            <div>
              Page <span className="font-bold text-white">{page}</span> of{" "}
              <span className="font-bold text-white">{totalPages}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-slate-800 text-slate-300"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-slate-800 text-slate-300"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Moderation Confirmation Modal */}
      {modalAction && targetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-lg max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center gap-3">
              <div
                className={`p-2 rounded-md ${
                  modalAction === "ban"
                    ? "bg-red-950/60 text-red-400"
                    : modalAction === "suspend"
                      ? "bg-amber-950/60 text-amber-400"
                      : "bg-emerald-950/60 text-emerald-400"
                }`}
              >
                {modalAction === "ban" ? (
                  <Ban className="w-5 h-5" />
                ) : modalAction === "suspend" ? (
                  <AlertTriangle className="w-5 h-5" />
                ) : (
                  <CheckCircle className="w-5 h-5" />
                )}
              </div>
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                  Confirm {modalAction} Operation
                </h3>
                <p className="text-xs text-slate-400">
                  Target:{" "}
                  <span className="text-white font-mono">
                    {targetUser.profile?.codename || targetUser.telegramId}
                  </span>
                </p>
              </div>
            </div>

            {actionFeedback && (
              <div className="p-3 rounded bg-red-950/40 border border-red-800/40 text-red-300 text-xs font-mono">
                {actionFeedback}
              </div>
            )}

            <form onSubmit={handleModerationSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Justification / Moderation Note{" "}
                  {modalAction !== "restore" && <span className="text-red-400">*</span>}
                </label>
                <textarea
                  required={modalAction !== "restore"}
                  rows={3}
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  placeholder={`Reason for ${modalAction}ing this operative (recorded in audit logs)...`}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-md text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-red-500 font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  disabled={submittingAction}
                  onClick={() => {
                    setModalAction(null);
                    setTargetUser(null);
                  }}
                  className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    submittingAction ||
                    (modalAction !== "restore" && actionReason.trim().length < 5)
                  }
                  className={`px-4 py-1.5 rounded text-xs font-medium text-white transition-colors flex items-center gap-1.5 ${
                    modalAction === "ban"
                      ? "bg-red-600 hover:bg-red-500 disabled:opacity-40"
                      : modalAction === "suspend"
                        ? "bg-amber-600 hover:bg-amber-500 disabled:opacity-40"
                        : "bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40"
                  }`}
                >
                  {submittingAction && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>Execute {modalAction}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
