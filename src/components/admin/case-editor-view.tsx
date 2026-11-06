"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Briefcase,
  ArrowLeft,
  Save,
  CheckCircle2,
  AlertCircle,
  Layers,
  Users,
  Search,
  KeyRound,
  ShieldAlert,
  Plus,
  Trash2,
  Lock,
  Unlock,
  Eye,
  Check,
} from "lucide-react";

interface CaseDetail {
  id: string;
  caseCode: string;
  title: string;
  description: string;
  difficulty: "EASY" | "MEDIUM" | "HARD" | "EXPERT";
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  estimatedDurationMinutes: number;
  minPlayers: number;
  maxPlayers: number;
  campaignId: string | null;
  chapters: Array<{ id: string; chapterOrder: number; title: string; description: string }>;
  characters: Array<{
    id: string;
    name: string;
    role: string;
    description: string;
    isSuspect: boolean;
  }>;
  clues: Array<{ id: string; title: string; description: string; clueType: string }>;
  puzzles: Array<{ id: string; title: string; puzzleType: string; order: number }>;
  solutionConfig?: {
    primaryCharacterId?: string;
    motiveKeywords?: string[];
    methodKeywords?: string[];
    requiredClueIds?: string[];
    explanation?: string;
  } | null;
}

export function AdminCaseEditorView({ caseId }: { caseId: string }) {
  const [caseData, setCaseData] = useState<CaseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<
    "general" | "chapters" | "characters" | "clues" | "puzzles" | "solution"
  >("general");

  // General Form
  const [generalForm, setGeneralForm] = useState({
    title: "",
    description: "",
    difficulty: "MEDIUM",
    estimatedDurationMinutes: 45,
    minPlayers: 1,
    maxPlayers: 4,
    status: "DRAFT",
  });
  const [savingGeneral, setSavingGeneral] = useState(false);
  const [generalMsg, setGeneralMsg] = useState<{ type: "success" | "error"; text: string } | null>(
    null
  );

  // Solution Form
  const [solutionForm, setSolutionForm] = useState({
    primaryCharacterId: "",
    motiveKeywords: "",
    methodKeywords: "",
    explanation: "",
  });
  const [savingSolution, setSavingSolution] = useState(false);
  const [solutionMsg, setSolutionMsg] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Modals for adding items
  const [showChapterModal, setShowChapterModal] = useState(false);
  const [chapterForm, setChapterForm] = useState({ chapterOrder: 1, title: "", description: "" });
  const [showCharModal, setShowCharModal] = useState(false);
  const [charForm, setCharForm] = useState({
    name: "",
    role: "",
    description: "",
    isSuspect: true,
  });
  const [showClueModal, setShowClueModal] = useState(false);
  const [clueForm, setClueForm] = useState({ title: "", description: "", clueType: "DOCUMENT" });

  const fetchDetail = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/cases/${caseId}`);
      const json = await res.json();
      if (json.ok && json.data.case) {
        const c = json.data.case;
        setCaseData(c);
        setGeneralForm({
          title: c.title,
          description: c.description,
          difficulty: c.difficulty,
          estimatedDurationMinutes: c.estimatedDurationMinutes,
          minPlayers: c.minPlayers,
          maxPlayers: c.maxPlayers,
          status: c.status,
        });

        // Try to fetch solution config if permitted
        fetchSolutionConfig();
      }
    } catch (err) {
      console.error("Failed to load case", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSolutionConfig = async () => {
    try {
      const res = await fetch(`/api/admin/cases/${caseId}/solution`);
      if (res.ok) {
        const json = await res.json();
        const sol = json.data?.solutionConfig;
        if (sol) {
          setSolutionForm({
            primaryCharacterId: sol.primaryCharacterId || "",
            motiveKeywords: (sol.motiveKeywords || []).join(", "),
            methodKeywords: (sol.methodKeywords || []).join(", "),
            explanation: sol.explanation || "",
          });
        }
      }
    } catch (e) {
      // User might lack CASE_MANAGE_SOLUTION
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [caseId]);

  const handleSaveGeneral = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingGeneral(true);
    setGeneralMsg(null);
    try {
      const res = await fetch(`/api/admin/cases/${caseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(generalForm),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to update case parameters");
      }
      setGeneralMsg({ type: "success", text: "Case scenario updated successfully." });
      fetchDetail();
    } catch (err: any) {
      setGeneralMsg({ type: "error", text: err.message });
    } finally {
      setSavingGeneral(false);
    }
  };

  const handleSaveSolution = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSolution(true);
    setSolutionMsg(null);
    try {
      const payload = {
        primaryCharacterId: solutionForm.primaryCharacterId || undefined,
        motiveKeywords: solutionForm.motiveKeywords
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        methodKeywords: solutionForm.methodKeywords
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        explanation: solutionForm.explanation.trim() || undefined,
      };

      const res = await fetch(`/api/admin/cases/${caseId}/solution`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to update solution matrix");
      }
      setSolutionMsg({
        type: "success",
        text: "Protected solution configuration saved successfully.",
      });
    } catch (err: any) {
      setSolutionMsg({ type: "error", text: err.message });
    } finally {
      setSavingSolution(false);
    }
  };

  const handleCreateChapter = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/admin/chapters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...chapterForm, caseId }),
      });
      if (res.ok) {
        setShowChapterModal(false);
        setChapterForm({
          chapterOrder: (caseData?.chapters.length || 0) + 1,
          title: "",
          description: "",
        });
        fetchDetail();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateCharacter = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/admin/characters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...charForm, caseId }),
      });
      if (res.ok) {
        setShowCharModal(false);
        setCharForm({ name: "", role: "", description: "", isSuspect: true });
        fetchDetail();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateClue = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/admin/evidence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...clueForm, caseId }),
      });
      if (res.ok) {
        setShowClueModal(false);
        setClueForm({ title: "", description: "", clueType: "DOCUMENT" });
        fetchDetail();
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-500 font-mono text-sm">
        Loading scenario blueprint...
      </div>
    );
  }

  if (!caseData) {
    return (
      <div className="p-12 text-center text-red-400 font-mono text-sm">
        Case scenario not found.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link
            href="/admin/cases"
            className="inline-flex items-center gap-1.5 text-xs font-mono text-slate-400 hover:text-slate-200 transition-colors mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Case Catalog
          </Link>
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 font-bold">
              {caseData.caseCode}
            </span>
            <h1 className="text-xl font-bold font-mono tracking-tight text-slate-100">
              {caseData.title}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`px-2.5 py-1 text-xs font-mono rounded border uppercase font-bold ${
              caseData.status === "PUBLISHED"
                ? "bg-emerald-950/60 border-emerald-500/40 text-emerald-400"
                : caseData.status === "DRAFT"
                  ? "bg-amber-950/60 border-amber-500/40 text-amber-400"
                  : "bg-slate-800 border-slate-700 text-slate-400"
            }`}
          >
            {caseData.status}
          </span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-800 gap-1 overflow-x-auto text-xs font-mono">
        <button
          onClick={() => setActiveTab("general")}
          className={`px-4 py-2.5 border-b-2 font-medium transition-colors whitespace-nowrap ${
            activeTab === "general"
              ? "border-blue-500 text-blue-400 bg-slate-900/60"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          General & Publication
        </button>
        <button
          onClick={() => setActiveTab("chapters")}
          className={`px-4 py-2.5 border-b-2 font-medium transition-colors whitespace-nowrap ${
            activeTab === "chapters"
              ? "border-blue-500 text-blue-400 bg-slate-900/60"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          Chapters ({caseData.chapters.length})
        </button>
        <button
          onClick={() => setActiveTab("characters")}
          className={`px-4 py-2.5 border-b-2 font-medium transition-colors whitespace-nowrap ${
            activeTab === "characters"
              ? "border-blue-500 text-blue-400 bg-slate-900/60"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          Suspects ({caseData.characters.length})
        </button>
        <button
          onClick={() => setActiveTab("clues")}
          className={`px-4 py-2.5 border-b-2 font-medium transition-colors whitespace-nowrap ${
            activeTab === "clues"
              ? "border-blue-500 text-blue-400 bg-slate-900/60"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          Forensic Evidence ({caseData.clues.length})
        </button>
        <button
          onClick={() => setActiveTab("puzzles")}
          className={`px-4 py-2.5 border-b-2 font-medium transition-colors whitespace-nowrap ${
            activeTab === "puzzles"
              ? "border-blue-500 text-blue-400 bg-slate-900/60"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          Puzzles ({caseData.puzzles.length})
        </button>
        <button
          onClick={() => setActiveTab("solution")}
          className={`px-4 py-2.5 border-b-2 font-medium transition-colors whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === "solution"
              ? "border-red-500 text-red-400 bg-red-950/20"
              : "border-transparent text-slate-400 hover:text-red-400"
          }`}
        >
          <Lock className="w-3.5 h-3.5 text-red-400" />
          Protected Solution Matrix
        </button>
      </div>

      {/* Tab 1: General & Publication */}
      {activeTab === "general" && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-6">
          <form onSubmit={handleSaveGeneral} className="space-y-4 max-w-2xl text-xs font-mono">
            {generalMsg && (
              <div
                className={`p-3 rounded-lg border flex items-center gap-2 ${
                  generalMsg.type === "success"
                    ? "bg-emerald-950/60 border-emerald-500/40 text-emerald-300"
                    : "bg-red-950/60 border-red-500/40 text-red-300 whitespace-pre-line"
                }`}
              >
                {generalMsg.type === "success" ? (
                  <Check className="w-4 h-4 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0" />
                )}
                {generalMsg.text}
              </div>
            )}

            <div>
              <label className="block text-slate-400 mb-1">Scenario Title</label>
              <input
                type="text"
                required
                value={generalForm.title}
                onChange={(e) => setGeneralForm({ ...generalForm, title: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-blue-500 font-sans text-sm"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Narrative Synopsis</label>
              <textarea
                required
                rows={4}
                value={generalForm.description}
                onChange={(e) => setGeneralForm({ ...generalForm, description: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-blue-500 font-sans text-xs leading-relaxed"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-400 mb-1">Difficulty Rating</label>
                <select
                  value={generalForm.difficulty}
                  onChange={(e) =>
                    setGeneralForm({ ...generalForm, difficulty: e.target.value as any })
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
                <label className="block text-slate-400 mb-1">Est. Duration (Minutes)</label>
                <input
                  type="number"
                  min={10}
                  max={300}
                  value={generalForm.estimatedDurationMinutes}
                  onChange={(e) =>
                    setGeneralForm({
                      ...generalForm,
                      estimatedDurationMinutes: parseInt(e.target.value, 10) || 45,
                    })
                  }
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Publication Status</label>
              <select
                value={generalForm.status}
                onChange={(e) => setGeneralForm({ ...generalForm, status: e.target.value as any })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-blue-500"
              >
                <option value="DRAFT">DRAFT (Hidden from Operatives)</option>
                <option value="PUBLISHED">PUBLISHED (Live on Network)</option>
                <option value="ARCHIVED">ARCHIVED (Decommissioned)</option>
              </select>
              <p className="text-slate-500 mt-1">
                Note: Changing status to PUBLISHED validates chapters, clues, suspects, puzzles, and
                evaluation keys.
              </p>
            </div>

            <div className="pt-4 border-t border-slate-800 flex justify-end">
              <button
                type="submit"
                disabled={savingGeneral}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium transition-colors disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {savingGeneral ? "Saving..." : "Save Case Parameters"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tab 2: Chapters */}
      {activeTab === "chapters" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-bold font-mono text-slate-200">
              Investigation Acts & Chapters
            </h2>
            <button
              onClick={() => setShowChapterModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-mono font-medium transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Act/Chapter
            </button>
          </div>

          <div className="space-y-3">
            {caseData.chapters.map((ch) => (
              <div
                key={ch.id}
                className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-start gap-4"
              >
                <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center font-mono font-bold text-sm text-slate-300 shrink-0">
                  {ch.chapterOrder}
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-bold text-slate-200">{ch.title}</h3>
                  <p className="text-xs text-slate-400 mt-1">{ch.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Characters */}
      {activeTab === "characters" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-bold font-mono text-slate-200">
              Suspects & Persons of Interest
            </h2>
            <button
              onClick={() => setShowCharModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-mono font-medium transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Character
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {caseData.characters.map((char) => (
              <div
                key={char.id}
                className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-200">{char.name}</h3>
                    {char.isSuspect && (
                      <span className="px-2 py-0.5 text-xs font-mono rounded bg-red-950/60 border border-red-500/40 text-red-400">
                        Suspect
                      </span>
                    )}
                  </div>
                  <div className="text-xs font-mono text-blue-400 mt-0.5">{char.role}</div>
                  <p className="text-xs text-slate-400 mt-2 line-clamp-3">{char.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 4: Clues */}
      {activeTab === "clues" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-bold font-mono text-slate-200">
              Forensic Clues & Evidence
            </h2>
            <button
              onClick={() => setShowClueModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-mono font-medium transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Evidence Item
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {caseData.clues.map((clue) => (
              <div
                key={clue.id}
                className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-200">{clue.title}</h3>
                    <span className="px-2 py-0.5 text-xs font-mono rounded bg-slate-800 border border-slate-700 text-slate-300">
                      {clue.clueType}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-2 line-clamp-3">{clue.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 5: Puzzles */}
      {activeTab === "puzzles" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-bold font-mono text-slate-200">
              Interactive Ciphers & Puzzles
            </h2>
          </div>

          <div className="space-y-3">
            {caseData.puzzles.map((puz) => (
              <div
                key={puz.id}
                className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-950/60 border border-blue-800 text-blue-400 flex items-center justify-center font-mono font-bold text-xs">
                    #{puz.order}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-200">{puz.title}</h3>
                    <div className="text-xs font-mono text-slate-500">{puz.puzzleType}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 6: Protected Solution Matrix */}
      {activeTab === "solution" && (
        <div className="bg-slate-900/90 border border-red-500/30 rounded-xl p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 bg-red-950/60 border-l border-b border-red-500/40 px-3 py-1 text-xs font-mono text-red-400 font-bold flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5" />
            CLEARANCE REQUIRED: CASE_MANAGE_SOLUTION
          </div>

          <div className="mb-6">
            <h2 className="text-base font-bold font-mono text-red-400 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5" />
              Protected Case Solution Configuration
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Configure the correct culprit, key motive keywords, and execution narrative. This data
              is strictly separated from public client DTOs and used solely by the evaluation
              engine.
            </p>
          </div>

          <form onSubmit={handleSaveSolution} className="space-y-4 max-w-2xl text-xs font-mono">
            {solutionMsg && (
              <div
                className={`p-3 rounded-lg border flex items-center gap-2 ${
                  solutionMsg.type === "success"
                    ? "bg-emerald-950/60 border-emerald-500/40 text-emerald-300"
                    : "bg-red-950/60 border-red-500/40 text-red-300"
                }`}
              >
                {solutionMsg.type === "success" ? (
                  <Check className="w-4 h-4 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0" />
                )}
                {solutionMsg.text}
              </div>
            )}

            <div>
              <label className="block text-slate-400 mb-1">Guilty Suspect / Culprit</label>
              <select
                value={solutionForm.primaryCharacterId}
                onChange={(e) =>
                  setSolutionForm({ ...solutionForm, primaryCharacterId: e.target.value })
                }
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-red-500"
              >
                <option value="">-- Select Guilty Suspect --</option>
                {caseData.characters.map((char) => (
                  <option key={char.id} value={char.id}>
                    {char.name} ({char.role})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-400 mb-1">
                Motive Keywords (Comma-separated for automated deduction scoring)
              </label>
              <input
                type="text"
                placeholder="e.g. blackmail, embezzlement, corporate espionage"
                value={solutionForm.motiveKeywords}
                onChange={(e) =>
                  setSolutionForm({ ...solutionForm, motiveKeywords: e.target.value })
                }
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-red-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">
                Method / Modus Operandi Keywords (Comma-separated)
              </label>
              <input
                type="text"
                placeholder="e.g. poison, forged log, server override"
                value={solutionForm.methodKeywords}
                onChange={(e) =>
                  setSolutionForm({ ...solutionForm, methodKeywords: e.target.value })
                }
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-red-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">
                Full Canonical Solution Debriefing
              </label>
              <textarea
                rows={5}
                placeholder="Provide complete breakdown of how the crime transpired for results debriefing..."
                value={solutionForm.explanation}
                onChange={(e) => setSolutionForm({ ...solutionForm, explanation: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-red-500 font-sans text-xs leading-relaxed"
              />
            </div>

            <div className="pt-4 border-t border-slate-800 flex justify-end">
              <button
                type="submit"
                disabled={savingSolution}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-medium transition-colors disabled:opacity-50"
              >
                <Lock className="w-4 h-4" />
                {savingSolution ? "Securing Solution..." : "Save Protected Solution Matrix"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Add Chapter Modal */}
      {showChapterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-2xl">
            <h2 className="text-base font-bold font-mono text-slate-100 mb-3">Add Chapter / Act</h2>
            <form onSubmit={handleCreateChapter} className="space-y-4 text-xs font-mono">
              <div>
                <label className="block text-slate-400 mb-1">Chapter Order</label>
                <input
                  type="number"
                  required
                  min={1}
                  value={chapterForm.chapterOrder}
                  onChange={(e) =>
                    setChapterForm({
                      ...chapterForm,
                      chapterOrder: parseInt(e.target.value, 10) || 1,
                    })
                  }
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Chapter Title</label>
                <input
                  type="text"
                  required
                  value={chapterForm.title}
                  onChange={(e) => setChapterForm({ ...chapterForm, title: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-blue-500 font-sans text-xs"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Synopsis</label>
                <textarea
                  required
                  rows={3}
                  value={chapterForm.description}
                  onChange={(e) => setChapterForm({ ...chapterForm, description: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-blue-500 font-sans text-xs"
                />
              </div>
              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowChapterModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium"
                >
                  Save Act
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Character Modal */}
      {showCharModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-2xl">
            <h2 className="text-base font-bold font-mono text-slate-100 mb-3">
              Add Suspect / Character
            </h2>
            <form onSubmit={handleCreateCharacter} className="space-y-4 text-xs font-mono">
              <div>
                <label className="block text-slate-400 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={charForm.name}
                  onChange={(e) => setCharForm({ ...charForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-blue-500 font-sans text-xs"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Occupation / Role</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Chief Financial Officer"
                  value={charForm.role}
                  onChange={(e) => setCharForm({ ...charForm, role: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Dossier / Alibi</label>
                <textarea
                  required
                  rows={3}
                  value={charForm.description}
                  onChange={(e) => setCharForm({ ...charForm, description: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-blue-500 font-sans text-xs"
                />
              </div>
              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCharModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium"
                >
                  Save Character
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Clue Modal */}
      {showClueModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-2xl">
            <h2 className="text-base font-bold font-mono text-slate-100 mb-3">Add Forensic Clue</h2>
            <form onSubmit={handleCreateClue} className="space-y-4 text-xs font-mono">
              <div>
                <label className="block text-slate-400 mb-1">Clue Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Encrypted Thumb Drive"
                  value={clueForm.title}
                  onChange={(e) => setClueForm({ ...clueForm, title: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-blue-500 font-sans text-xs"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Evidence Type</label>
                <select
                  value={clueForm.clueType}
                  onChange={(e) => setClueForm({ ...clueForm, clueType: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-blue-500"
                >
                  <option value="DOCUMENT">DOCUMENT</option>
                  <option value="AUDIO">AUDIO</option>
                  <option value="IMAGE">IMAGE</option>
                  <option value="TRANSCRIPT">TRANSCRIPT</option>
                  <option value="PHYSICAL_ITEM">PHYSICAL_ITEM</option>
                  <option value="CIPHER">CIPHER</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Forensic Description</label>
                <textarea
                  required
                  rows={3}
                  value={clueForm.description}
                  onChange={(e) => setClueForm({ ...clueForm, description: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-blue-500 font-sans text-xs"
                />
              </div>
              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowClueModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium"
                >
                  Save Clue
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
