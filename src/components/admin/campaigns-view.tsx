"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Compass,
  Plus,
  RefreshCw,
  Edit2,
  CheckCircle,
  Archive,
  FileText,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import { ContentStatus } from "@prisma/client";

export function AdminCampaignsView() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [slug, setSlug] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/admin/campaigns");
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `HTTP error ${res.status}`);
      }
      const data = await res.json();
      setCampaigns(data.data.campaigns);
    } catch (err: any) {
      setError(err.message || "Failed to load campaigns");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setModalError(null);

      const res = await fetch("/api/admin/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, title, description }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to create campaign");
      }

      setShowCreateModal(false);
      setSlug("");
      setTitle("");
      setDescription("");
      await fetchCampaigns();
    } catch (err: any) {
      setModalError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusToggle = async (campaignId: string, currentStatus: ContentStatus) => {
    const nextStatus =
      currentStatus === ContentStatus.PUBLISHED ? ContentStatus.DRAFT : ContentStatus.PUBLISHED;

    try {
      const res = await fetch(`/api/admin/campaigns/${campaignId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to update campaign status");
      }

      await fetchCampaigns();
    } catch (err: any) {
      alert(`Error updating campaign: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Compass className="w-6 h-6 text-amber-400" />
            <span>Campaign Story Arcs</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Author overarching storylines, group investigative cases, and control public
            distribution.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-3.5 py-2 rounded-md bg-amber-600 hover:bg-amber-500 text-xs font-semibold text-white transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>New Campaign</span>
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 space-y-2">
          <RefreshCw className="w-5 h-5 animate-spin text-amber-400" />
          <span className="text-xs font-mono text-slate-400">Loading campaign catalog...</span>
        </div>
      ) : error ? (
        <div className="p-4 rounded bg-red-950/20 border border-red-800/40 text-red-300 text-xs font-mono">
          {error}
        </div>
      ) : campaigns.length === 0 ? (
        <div className="p-8 text-center bg-slate-900 rounded-lg border border-slate-800 text-slate-400 text-xs font-mono">
          No campaigns found. Click &quot;New Campaign&quot; to author the first narrative story
          arc.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {campaigns.map((camp) => (
            <div
              key={camp.id}
              className="p-5 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between space-y-4"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700/60">
                    {camp.slug}
                  </span>
                  <span
                    className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                      camp.status === ContentStatus.PUBLISHED
                        ? "bg-emerald-950/60 text-emerald-400 border border-emerald-800/40"
                        : "bg-slate-800 text-slate-400 border border-slate-700/60"
                    }`}
                  >
                    {camp.status}
                  </span>
                </div>

                <h3 className="text-base font-bold text-white tracking-tight">{camp.title}</h3>
                <p className="text-xs text-slate-400 line-clamp-3">{camp.description}</p>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs font-mono">
                <span className="text-slate-500">
                  Cases: <span className="text-white font-bold">{camp._count?.cases || 0}</span>
                </span>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleStatusToggle(camp.id, camp.status)}
                    className={`px-2.5 py-1 rounded text-[11px] font-sans font-medium transition-colors ${
                      camp.status === ContentStatus.PUBLISHED
                        ? "bg-slate-800 text-slate-300 hover:bg-slate-700"
                        : "bg-emerald-950/60 text-emerald-400 hover:bg-emerald-900 border border-emerald-800/40"
                    }`}
                  >
                    {camp.status === ContentStatus.PUBLISHED ? "Unpublish" : "Publish"}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Campaign Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-lg max-w-lg w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-base font-bold text-white">Author New Campaign Arc</h3>

            {modalError && (
              <div className="p-3 rounded bg-red-950/40 border border-red-800/40 text-red-300 text-xs font-mono">
                {modalError}
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Campaign Title
                </label>
                <input
                  required
                  type="text"
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    if (!slug) {
                      setSlug(
                        e.target.value
                          .toLowerCase()
                          .replace(/[^a-z0-9]+/g, "-")
                          .slice(0, 50)
                      );
                    }
                  }}
                  placeholder="e.g. Operation Obsidian Web"
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-md text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  URL Slug Identifier
                </label>
                <input
                  required
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="e.g. obsidian-web"
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-md text-xs text-slate-200 font-mono focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Campaign Narrative Description
                </label>
                <textarea
                  required
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Full background briefing and narrative arc details..."
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-md text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => setShowCreateModal(false)}
                  className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-xs text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !title.trim() || !slug.trim()}
                  className="px-4 py-1.5 rounded bg-amber-600 hover:bg-amber-500 text-xs font-medium text-white flex items-center gap-1.5"
                >
                  {submitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Campaign</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
