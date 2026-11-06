"use client";

import { useEffect, useState } from "react";
import {
  ShieldCheck,
  ShieldAlert,
  Users,
  KeyRound,
  Plus,
  Search,
  UserPlus,
  AlertCircle,
  Check,
} from "lucide-react";

interface RoleItem {
  id: string;
  name: string;
  description: string | null;
  userCount: number;
  permissions: Array<{
    id: string;
    action: string;
    description: string | null;
  }>;
}

export function AdminRolesView() {
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRole, setSelectedRole] = useState<RoleItem | null>(null);

  // Assign Role Modal
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [targetUserId, setTargetUserId] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [assignMsg, setAssignMsg] = useState<{ type: "success" | "error"; text: string } | null>(
    null
  );

  const fetchRoles = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/roles");
      const json = await res.json();
      if (json.ok) {
        setRoles(json.data.roles);
        if (json.data.roles.length > 0 && !selectedRole) {
          setSelectedRole(json.data.roles[0]);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  const handleAssignRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRole) return;

    setAssigning(true);
    setAssignMsg(null);
    try {
      const res = await fetch(`/api/admin/roles/${selectedRole.id}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: targetUserId.trim() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to assign role");

      setAssignMsg({
        type: "success",
        text: `Role '${selectedRole.name}' successfully assigned to user.`,
      });
      setTargetUserId("");
      fetchRoles();
    } catch (err: any) {
      setAssignMsg({ type: "error", text: err.message });
    } finally {
      setAssigning(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-mono tracking-tight text-slate-100 flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-red-500" />
            Roles & Granular RBAC Permissions
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Governance matrix, privilege escalation protection, and role assignment controls.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-500 font-mono text-sm">
          Loading permission governance schema...
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Roles List */}
          <div className="space-y-3">
            <h2 className="text-xs font-mono font-bold uppercase text-slate-400">System Roles</h2>
            {roles.map((r) => {
              const isSelected = selectedRole?.id === r.id;
              return (
                <div
                  key={r.id}
                  onClick={() => setSelectedRole(r)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? "bg-slate-900 border-red-500/60 shadow-lg shadow-red-950/20"
                      : "bg-slate-900/60 border-slate-800 hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-sm text-slate-200">{r.name}</span>
                    <span className="text-xs font-mono text-slate-500">{r.userCount} Assigned</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2">{r.description}</p>
                  <div className="mt-3 flex items-center gap-2 text-[10px] font-mono text-slate-400">
                    <KeyRound className="w-3 h-3 text-red-400" />
                    <span>{r.permissions.length} Permissions Attached</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Role Details & Permissions */}
          {selectedRole && (
            <div className="lg:col-span-2 space-y-4">
              <div className="p-5 rounded-xl bg-slate-900 border border-slate-800">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
                  <div>
                    <h2 className="text-lg font-bold font-mono text-slate-100 flex items-center gap-2">
                      {selectedRole.name}
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">{selectedRole.description}</p>
                  </div>

                  <button
                    onClick={() => {
                      setShowAssignModal(true);
                      setAssignMsg(null);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-mono text-xs font-medium transition-colors shadow-sm shadow-red-950"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    Assign Role to User
                  </button>
                </div>

                <div className="mt-4">
                  <h3 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider mb-3">
                    Granted Permissions ({selectedRole.permissions.length})
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-[460px] overflow-y-auto pr-1">
                    {selectedRole.permissions.map((p) => (
                      <div
                        key={p.id}
                        className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80 font-mono text-xs flex flex-col justify-between"
                      >
                        <div className="font-bold text-slate-200">{p.action}</div>
                        <div className="text-[10px] text-slate-400 mt-1 font-sans">
                          {p.description}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Assign Role Modal */}
      {showAssignModal && selectedRole && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-2xl">
            <h2 className="text-base font-bold font-mono text-slate-100 mb-1">
              Assign Role: {selectedRole.name}
            </h2>
            <p className="text-xs text-slate-400 mb-4">
              Enter target operative User UUID to grant clearance. Privilege escalation rules apply.
            </p>

            {assignMsg && (
              <div
                className={`p-3 mb-4 rounded-lg border text-xs font-mono flex items-center gap-2 ${
                  assignMsg.type === "success"
                    ? "bg-emerald-950/60 border-emerald-500/40 text-emerald-300"
                    : "bg-red-950/60 border-red-500/40 text-red-300"
                }`}
              >
                {assignMsg.type === "success" ? (
                  <Check className="w-4 h-4 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0" />
                )}
                {assignMsg.text}
              </div>
            )}

            <form onSubmit={handleAssignRole} className="space-y-4 text-xs font-mono">
              <div>
                <label className="block text-slate-400 mb-1">Target Operative User UUID</label>
                <input
                  type="text"
                  required
                  placeholder="00000000-0000-0000-0000-000000000000"
                  value={targetUserId}
                  onChange={(e) => setTargetUserId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-red-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={assigning}
                  className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold disabled:opacity-50"
                >
                  {assigning ? "Granting Clearance..." : "Confirm Role Assignment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
