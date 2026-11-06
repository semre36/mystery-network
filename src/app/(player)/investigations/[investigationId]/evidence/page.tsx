"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ChevronLeft,
  Shield,
  Layers,
  Search,
  Filter,
  RefreshCw,
  Loader2,
  AlertCircle,
  FileSearch,
} from "lucide-react";
import { ClueType } from "@prisma/client";
import type { SafeEvidenceSummaryDto } from "@/modules/evidence/types/evidence.types";
import { EvidenceCard } from "@/components/evidence/evidence-card";
import { EvidenceFilters } from "@/components/evidence/evidence-filters";
import { EvidenceDetailModal } from "@/components/evidence/evidence-detail-modal";

export default function EvidenceVaultPage() {
  const params = useParams();
  const investigationId = params.investigationId as string;

  const [evidenceList, setEvidenceList] = useState<SafeEvidenceSummaryDto[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filter States
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedType, setSelectedType] = useState<ClueType | undefined>(undefined);
  const [selectedScope, setSelectedScope] = useState<
    "ALL" | "MINE" | "SHARED" | "INVESTIGATION_WIDE"
  >("ALL");

  // Active Evidence Modal
  const [inspectedEvidenceId, setInspectedEvidenceId] = useState<string | null>(null);

  const fetchEvidence = useCallback(async () => {
    if (!investigationId) return;

    try {
      setLoading(true);
      setError(null);

      const url = new URL(
        `/api/investigations/${investigationId}/evidence`,
        window.location.origin
      );

      if (selectedScope) url.searchParams.set("scope", selectedScope);
      if (selectedType) url.searchParams.set("type", selectedType);
      if (searchQuery.trim()) url.searchParams.set("search", searchQuery.trim());

      const res = await fetch(url.toString());
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || "Failed to load evidence vault.");
      }

      setEvidenceList(json.data.items);
      setTotalCount(json.data.total);
    } catch (err: any) {
      setError(err.message || "Failed to retrieve classified evidence.");
    } finally {
      setLoading(false);
    }
  }, [investigationId, selectedScope, selectedType, searchQuery]);

  useEffect(() => {
    let isCancelled = false;

    const url = new URL(`/api/investigations/${investigationId}/evidence`, window.location.origin);

    if (selectedScope) url.searchParams.set("scope", selectedScope);
    if (selectedType) url.searchParams.set("type", selectedType);
    if (searchQuery.trim()) url.searchParams.set("search", searchQuery.trim());

    fetch(url.toString())
      .then(async (res) => {
        if (!res.ok) {
          const json = await res.json();
          throw new Error(json.error || "Failed to load evidence vault.");
        }
        return res.json();
      })
      .then((json) => {
        if (!isCancelled) {
          setEvidenceList(json.data.items);
          setTotalCount(json.data.total);
          setLoading(false);
        }
      })
      .catch((err: any) => {
        if (!isCancelled) {
          setError(err.message || "Failed to retrieve classified evidence.");
          setLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [investigationId, selectedScope, selectedType, searchQuery]);

  // Compute live scope metrics
  const counts = {
    all: evidenceList.length,
    mine: evidenceList.filter((e) => e.accessType === "ASSIGNED").length,
    shared: evidenceList.filter((e) => e.accessType === "SHARED").length,
    investigationWide: evidenceList.filter((e) => e.accessType === "INVESTIGATION_WIDE").length,
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      {/* Back Link & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <Link
            href={`/investigations/${investigationId}`}
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-cyan-400 transition-colors mb-2 font-mono"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            <span>Return to Workspace</span>
          </Link>

          <div className="flex items-center gap-3">
            <div className="rounded-lg border border-cyan-500/30 bg-cyan-950/40 p-2 text-cyan-400">
              <Shield className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-100 sm:text-2xl">
                Classified Evidence Vault
              </h1>
              <p className="text-xs text-slate-400 font-mono">
                SESSION ID: {investigationId.substring(0, 8)}... // DISCOVERY & CLUE MATRIX
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={fetchEvidence}
          disabled={loading}
          className="self-start sm:self-auto flex items-center gap-2 rounded-lg border border-slate-800 bg-[#0c1222] px-3 py-1.5 text-xs font-semibold text-slate-300 hover:border-slate-700 hover:text-white transition-all cursor-pointer"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-cyan-400" : ""}`} />
          <span>Refresh Intel</span>
        </button>
      </div>

      {/* Filter Component */}
      <EvidenceFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedType={selectedType}
        onTypeChange={setSelectedType}
        selectedScope={selectedScope}
        onScopeChange={setSelectedScope}
        counts={counts}
      />

      {/* Main Evidence Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-slate-800 bg-[#070b14] p-16 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-cyan-400 mb-3" />
          <p className="text-xs font-mono text-slate-400">
            Scanning secure repository for unlocked clues...
          </p>
        </div>
      ) : error ? (
        <div className="rounded-xl border border-rose-800/50 bg-rose-950/30 p-8 text-center">
          <AlertCircle className="mx-auto h-8 w-8 text-rose-400 mb-2" />
          <h3 className="text-sm font-semibold text-rose-200">Repository Error</h3>
          <p className="text-xs text-slate-400 mt-1 mb-4">{error}</p>
          <button
            onClick={fetchEvidence}
            className="rounded bg-rose-900/60 border border-rose-700 px-4 py-1.5 text-xs text-rose-200 hover:bg-rose-800/80 cursor-pointer"
          >
            Retry Connection
          </button>
        </div>
      ) : evidenceList.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-800 bg-[#070b14]/60 p-16 text-center">
          <div className="rounded-full bg-slate-800/60 p-4 text-slate-500 mb-3">
            <FileSearch className="h-8 w-8" />
          </div>
          <h3 className="text-sm font-semibold text-slate-300">No Classified Evidence Found</h3>
          <p className="text-xs text-slate-500 max-w-sm mt-1">
            {searchQuery || selectedType || selectedScope !== "ALL"
              ? "No evidence in this investigation matches the active filter criteria."
              : "No evidence has been discovered or unlocked for your unit yet. Advance through case acts to uncover clues."}
          </p>
          {(searchQuery || selectedType || selectedScope !== "ALL") && (
            <button
              onClick={() => {
                setSearchQuery("");
                setSelectedType(undefined);
                setSelectedScope("ALL");
              }}
              className="mt-4 rounded border border-slate-700 bg-slate-800 px-3.5 py-1.5 text-xs text-cyan-300 hover:bg-slate-700 cursor-pointer"
            >
              Clear Active Filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {evidenceList.map((evidence) => (
            <EvidenceCard
              key={evidence.id}
              evidence={evidence}
              onInspect={(id) => setInspectedEvidenceId(id)}
            />
          ))}
        </div>
      )}

      {/* Evidence Detail Modal */}
      <EvidenceDetailModal
        key={inspectedEvidenceId}
        investigationId={investigationId}
        evidenceId={inspectedEvidenceId}
        onClose={() => setInspectedEvidenceId(null)}
        onEvidenceUpdated={fetchEvidence}
      />
    </div>
  );
}
