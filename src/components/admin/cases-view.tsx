"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Briefcase,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Archive,
  Layers,
  Users,
  Eye,
  AlertCircle,
  ExternalLink,
} from "lucide-react";

interface CaseSummary {
  id: string;
  caseCode: string;
  title: string;
  description: string;
  difficulty: "EASY" | "MEDIUM" | "HARD" | "EXPERT";
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  estimatedDurationMinutes: number;
  minPlayers: number;
  maxPlayers: number;
  campaign?: { id: string; title: string; slug: string } | null;
  _count: {
    chapters: number;
    characters: number;
    clues: number;
    puzzles: number;
    investigations: number;
  };
  createdAt: string;
}

export function AdminCasesView() {
  const [cases, setCases] = useState<CaseSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [search, setSearch] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState({
    caseCode: "",
    title: "",
    description: "",
    difficulty: "MEDIUM",
    estimatedDurationMinutes: 45,
    minPlayers: 1,
    maxPlayers: 4,
  });
  const [createError, setCreateError] = useState<string | null>(null);

  const fetchCases = async () => {
    setLoading(true);
    try {
      const url =
        statusFilter !== "ALL" ? `/api/admin/cases?status=${statusFilter}` : "/api/admin/cases";
      const res = await fetch(url);
      const json = await res.json();
      if (json.ok) {
        setCases(json.data.cases);
      }
    } catch (err) {
      console.error("Failed to load cases", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCases();
  }, [statusFilter]);

  const handleCreateCase = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setCreateError(null);
    try {
      const res = await fetch("/api/admin/cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createForm),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to create case");
      }
      setShowCreateModal(false);
      setCreateForm({
        caseCode: "",
        title: "",
        description: "",
        difficulty: "MEDIUM",
        estimatedDurationMinutes: 45,
        minPlayers: 1,
        maxPlayers: 4,
      });
      fetchCases();
    } catch (err: any) {
      setCreateError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const filtered = cases.filter(
    (c) =>
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.caseCode.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold font-mono tracking-tight text-slate-100">
              Case Scenarios CMS
            </h1>
            <span className="px-2 py-0.5 text-xs rounded bg-blue-950/80 border border-blue-800 text-blue-300 font-mono">
              {cases.length} Total
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Author mystery scenarios, configure forensic clues, interactive puzzles, and secret
            solution keys.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm transition-colors shadow-md shadow-blue-950"
        >
          <Plus className="w-4 h-4" />
          Author New Case
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="relative md:col-span-2">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by case code or scenario title..."
            className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-blue-500 font-mono"
          >
            <option value="ALL">All Publication States</option>
            <option value="DRAFT">Draft Mode</option>
            <option value="PUBLISHED">Published Live</option>
            <option value="ARCHIVED">Archived</option>
          </select>
        </div>
      </div>

      {/* Case Grid */}
      {loading ? (
        <div className="p-12 text-center text-slate-500 font-mono text-sm">
          Loading scenario manifests...
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center border border-dashed border-slate-800 rounded-xl bg-slate-900/40">
          <Briefcase className="w-8 h-8 text-slate-600 mx-auto mb-3" />
          <p className="text-sm text-slate-400 font-medium">No mystery cases match your filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtered.map((c) => (
            <div
              key={c.id}
              className="p-5 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition-colors flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300">
                      {c.caseCode}
                    </span>
                    <h3 className="text-base font-bold text-slate-200 mt-2 line-clamp-1">
                      {c.title}
                    </h3>
                  </div>

                  <span
                    className={`px-2 py-0.5 text-xs font-mono rounded border uppercase ${
                      c.status === "PUBLISHED"
                        ? "bg-emerald-950/60 border-emerald-500/40 text-emerald-400"
                        : c.status === "DRAFT"
                          ? "bg-amber-950/60 border-amber-500/40 text-amber-400"
                          : "bg-slate-800 border-slate-700 text-slate-400"
                    }`}
                  >
                    {c.status}
                  </span>
                </div>

                <p className="text-xs text-slate-400 mt-2 line-clamp-2 leading-relaxed">
                  {c.description}
                </p>

                {/* Badges / Metrics */}
                <div className="grid grid-cols-4 gap-2 mt-4 pt-3 border-t border-slate-800/80 text-center font-mono">
                  <div className="p-2 rounded bg-slate-950/60 border border-slate-800/80">
                    <div className="text-xs text-slate-500">Chapters</div>
                    <div className="text-sm font-semibold text-slate-200">{c._count.chapters}</div>
                  </div>
                  <div className="p-2 rounded bg-slate-950/60 border border-slate-800/80">
                    <div className="text-xs text-slate-500">Suspects</div>
                    <div className="text-sm font-semibold text-slate-200">
                      {c._count.characters}
                    </div>
                  </div>
                  <div className="p-2 rounded bg-slate-950/60 border border-slate-800/80">
                    <div className="text-xs text-slate-500">Clues</div>
                    <div className="text-sm font-semibold text-slate-200">{c._count.clues}</div>
                  </div>
                  <div className="p-2 rounded bg-slate-950/60 border border-slate-800/80">
                    <div className="text-xs text-slate-500">Puzzles</div>
                    <div className="text-sm font-semibold text-slate-200">{c._count.puzzles}</div>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                <div className="flex items-center gap-3">
                  <span className="capitalize">{c.difficulty.toLowerCase()}</span>
                  <span>•</span>
                  <span>~{c.estimatedDurationMinutes}m</span>
                  <span>•</span>
                  <span>{c._count.investigations} sessions</span>
                </div>

                <Link
                  href={`/admin/cases/${c.id}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono font-medium transition-colors border border-slate-700"
                >
                  Manage Scenario
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Case Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-2xl">
            <h2 className="text-lg font-bold font-mono text-slate-100 mb-1">
              Author New Case Scenario
            </h2>
            <p className="text-xs text-slate-400 mb-4">
              Enter scenario identifier and narrative briefing.
            </p>

            {createError && (
              <div className="p-3 mb-4 rounded-lg bg-red-950/60 border border-red-500/40 text-red-300 text-xs flex items-center gap-2 font-mono">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateCase} className="space-y-4 text-xs font-mono">
              <div>
                <label className="block text-slate-400 mb-1">Case Code (Unique Identifier)</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. CASE-002-GHOST-CIRCUIT"
                  value={createForm.caseCode}
                  onChange={(e) => setCreateForm({ ...createForm, caseCode: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Scenario Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ghost in the Circuit"
                  value={createForm.title}
                  onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-blue-500 font-sans text-sm"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Synopsis & Briefing</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Provide executive case synopsis for detectives..."
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-blue-500 font-sans text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Difficulty</label>
                  <select
                    value={createForm.difficulty}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, difficulty: e.target.value as any })
                    }
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-blue-500"
                  >
                    <option value="EASY">EASY</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="HARD">HARD</option>
                    <option value="EXPERT">EXPERT</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Est. Duration (Min)</label>
                  <input
                    type="number"
                    min={15}
                    max={240}
                    value={createForm.estimatedDurationMinutes}
                    onChange={(e) =>
                      setCreateForm({
                        ...createForm,
                        estimatedDurationMinutes: parseInt(e.target.value, 10) || 45,
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium transition-colors disabled:opacity-50"
                >
                  {creating ? "Creating Case..." : "Save Draft Scenario"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
