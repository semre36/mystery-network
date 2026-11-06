"use client";

import { useEffect, useState } from "react";
import {
  Coins,
  Plus,
  Search,
  Filter,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";

interface XPTransactionItem {
  id: string;
  playerId: string;
  playerCodename: string;
  amount: number;
  reason: string;
  referenceKey: string | null;
  investigationCaseCode: string | null;
  createdAt: string;
}

export function AdminRewardsView() {
  const [transactions, setTransactions] = useState<XPTransactionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Manual Adjustment Modal
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [adjustForm, setAdjustForm] = useState({
    playerId: "",
    amount: 100,
    reason: "",
  });
  const [adjusting, setAdjusting] = useState(false);
  const [adjustError, setAdjustError] = useState<string | null>(null);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/rewards/transactions?page=${page}&limit=25`);
      const json = await res.json();
      if (json.ok) {
        setTransactions(json.data.transactions);
        setTotalPages(json.data.totalPages);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [page]);

  const handleAdjustXP = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdjusting(true);
    setAdjustError(null);
    try {
      const res = await fetch("/api/admin/rewards/adjust-xp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(adjustForm),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to adjust XP");

      setShowAdjustModal(false);
      setAdjustForm({ playerId: "", amount: 100, reason: "" });
      fetchTransactions();
    } catch (err: any) {
      setAdjustError(err.message);
    } finally {
      setAdjusting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-mono tracking-tight text-slate-100 flex items-center gap-2">
            <Coins className="w-6 h-6 text-amber-400" />
            Operative XP Ledger & Adjustments
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Complete audit trail of all experience point awards, deduction bonuses, and manual
            moderator grants.
          </p>
        </div>

        <button
          onClick={() => setShowAdjustModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-slate-950 font-mono font-bold text-sm transition-colors shadow-md shadow-amber-950"
        >
          <Plus className="w-4 h-4" />
          Manual XP Adjustment
        </button>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="p-3.5">Operative Codename</th>
                <th className="p-3.5">XP Delta</th>
                <th className="p-3.5">Reason / Justification</th>
                <th className="p-3.5">Case Context</th>
                <th className="p-3.5">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500">
                    Scanning transaction block ledger...
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500">
                    No XP transactions recorded yet.
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-3.5 font-bold text-slate-200">{tx.playerCodename}</td>
                    <td className="p-3.5">
                      <span
                        className={`inline-flex items-center gap-1 font-bold ${
                          tx.amount >= 0 ? "text-emerald-400" : "text-red-400"
                        }`}
                      >
                        {tx.amount >= 0 ? (
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        ) : (
                          <ArrowDownRight className="w-3.5 h-3.5" />
                        )}
                        {tx.amount >= 0 ? `+${tx.amount}` : tx.amount} XP
                      </span>
                    </td>
                    <td className="p-3.5 text-slate-300 font-sans max-w-xs truncate">
                      {tx.reason}
                    </td>
                    <td className="p-3.5 text-slate-400">
                      {tx.investigationCaseCode ? (
                        <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300">
                          {tx.investigationCaseCode}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="p-3.5 text-slate-400">
                      {new Date(tx.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))
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

      {/* Manual XP Adjustment Modal */}
      {showAdjustModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-2xl">
            <h2 className="text-base font-bold font-mono text-slate-100 mb-1">
              Audited XP Ledger Adjustment
            </h2>
            <p className="text-xs text-slate-400 mb-4">
              All manual adjustments are permanently recorded in the Admin Audit Log.
            </p>

            {adjustError && (
              <div className="p-3 mb-4 rounded-lg bg-red-950/60 border border-red-500/40 text-red-300 text-xs font-mono">
                {adjustError}
              </div>
            )}

            <form onSubmit={handleAdjustXP} className="space-y-4 text-xs font-mono">
              <div>
                <label className="block text-slate-400 mb-1">Operative Profile UUID</label>
                <input
                  type="text"
                  required
                  placeholder="00000000-0000-0000-0000-000000000000"
                  value={adjustForm.playerId}
                  onChange={(e) => setAdjustForm({ ...adjustForm, playerId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">
                  XP Delta Amount (Positive or Negative)
                </label>
                <input
                  type="number"
                  required
                  value={adjustForm.amount}
                  onChange={(e) =>
                    setAdjustForm({ ...adjustForm, amount: parseInt(e.target.value, 10) || 0 })
                  }
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">
                  Mandatory Operational Reason (Min 5 chars)
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="e.g. Investigation bug compensation / event bonus award"
                  value={adjustForm.reason}
                  onChange={(e) => setAdjustForm({ ...adjustForm, reason: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-amber-500 font-sans text-xs"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAdjustModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={adjusting}
                  className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold"
                >
                  {adjusting ? "Processing..." : "Commit Adjustment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
