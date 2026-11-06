"use client";

import { useEffect, useState } from "react";
import { Award, Plus, Search, Filter, CheckCircle2, AlertCircle } from "lucide-react";

interface AchievementItem {
  id: string;
  code: string;
  title: string;
  description: string;
  category: "DEDUCTION" | "PUZZLE" | "COLLABORATION" | "SPEED" | "EXPLORATION" | "MASTERY";
  unlockedCount: number;
  criteria: any;
  createdAt: string;
}

export function AdminAchievementsView() {
  const [achievements, setAchievements] = useState<AchievementItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    code: "",
    title: "",
    description: "",
    category: "DEDUCTION",
  });
  const [creating, setCreating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchAchievements = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/achievements");
      const json = await res.json();
      if (json.ok) {
        setAchievements(json.data.achievements);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAchievements();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/admin/achievements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createForm),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to create accolade");

      setShowCreateModal(false);
      setCreateForm({ code: "", title: "", description: "", category: "DEDUCTION" });
      fetchAchievements();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setCreating(false);
    }
  };

  const filtered = achievements.filter(
    (a) =>
      a.title.toLowerCase().includes(search.toLowerCase()) ||
      a.code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-mono tracking-tight text-slate-100 flex items-center gap-2">
            <Award className="w-6 h-6 text-yellow-500" />
            Accolade & Achievement Catalog
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Configure detective milestones, badge criteria, and progression incentives.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-yellow-600 hover:bg-yellow-500 text-slate-950 font-mono font-bold text-sm transition-colors shadow-md shadow-yellow-950"
        >
          <Plus className="w-4 h-4" />
          Add Accolade
        </button>
      </div>

      <div className="relative">
        <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search accolades by code or title..."
          className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-yellow-500 font-mono"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full p-12 text-center text-slate-500 font-mono text-sm">
            Loading achievement catalog...
          </div>
        ) : filtered.length === 0 ? (
          <div className="col-span-full p-12 text-center text-slate-500 font-mono text-sm">
            No accolades match your search query.
          </div>
        ) : (
          filtered.map((item) => (
            <div
              key={item.id}
              className="p-5 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-yellow-950/60 border border-yellow-500/40 text-yellow-400">
                    {item.code}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400 uppercase">
                    {item.category}
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-200 mt-2">{item.title}</h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">{item.description}</p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs font-mono text-slate-400">
                <span>Unlocked By:</span>
                <span className="text-slate-200 font-bold">{item.unlockedCount} Operatives</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create Accolade Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-2xl">
            <h2 className="text-base font-bold font-mono text-slate-100 mb-1">
              Author New Accolade
            </h2>
            <p className="text-xs text-slate-400 mb-4">
              Define milestone criteria and badge identifier.
            </p>

            {errorMsg && (
              <div className="p-3 mb-4 rounded-lg bg-red-950/60 border border-red-500/40 text-red-300 text-xs font-mono">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-4 text-xs font-mono">
              <div>
                <label className="block text-slate-400 mb-1">Accolade Code</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. MASTER_DECRYPTOR"
                  value={createForm.code}
                  onChange={(e) => setCreateForm({ ...createForm, code: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-yellow-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Master Decryptor"
                  value={createForm.title}
                  onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-yellow-500 font-sans text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Narrative Description</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Explain achievement unlock criteria..."
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-yellow-500 font-sans text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Category</label>
                <select
                  value={createForm.category}
                  onChange={(e) => setCreateForm({ ...createForm, category: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-yellow-500"
                >
                  <option value="DEDUCTION">DEDUCTION</option>
                  <option value="PUZZLE">PUZZLE</option>
                  <option value="COLLABORATION">COLLABORATION</option>
                  <option value="SPEED">SPEED</option>
                  <option value="EXPLORATION">EXPLORATION</option>
                  <option value="MASTERY">MASTERY</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2 rounded-lg bg-yellow-600 hover:bg-yellow-500 text-slate-950 font-bold"
                >
                  {creating ? "Saving..." : "Save Accolade"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
