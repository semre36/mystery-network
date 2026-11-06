"use client";

import React from "react";
import { Search, Filter, Shield, Lock, Share2, Globe, X } from "lucide-react";
import { ClueType } from "@prisma/client";

interface EvidenceFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedType?: ClueType;
  onTypeChange: (type?: ClueType) => void;
  selectedScope: "ALL" | "MINE" | "SHARED" | "INVESTIGATION_WIDE";
  onScopeChange: (scope: "ALL" | "MINE" | "SHARED" | "INVESTIGATION_WIDE") => void;
  counts: {
    all: number;
    mine: number;
    shared: number;
    investigationWide: number;
  };
}

const CLUE_TYPES: Array<{ value: ClueType; label: string }> = [
  { value: ClueType.DOCUMENT, label: "Documents" },
  { value: ClueType.PHOTOGRAPH, label: "Photographs" },
  { value: ClueType.AUDIO_LOG, label: "Audio Logs" },
  { value: ClueType.FORENSIC_ITEM, label: "Forensic Items" },
  { value: ClueType.CIPHER_FRAGMENT, label: "Cipher Fragments" },
  { value: ClueType.TESTIMONY, label: "Testimonies" },
];

export const EvidenceFilters: React.FC<EvidenceFiltersProps> = ({
  searchQuery,
  onSearchChange,
  selectedType,
  onTypeChange,
  selectedScope,
  onScopeChange,
  counts,
}) => {
  return (
    <div className="space-y-4">
      {/* Scope Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-3">
        <button
          onClick={() => onScopeChange("ALL")}
          className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-medium transition-all ${
            selectedScope === "ALL"
              ? "bg-cyan-500/15 text-cyan-300 border border-cyan-500/40 shadow-sm shadow-cyan-950"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent"
          }`}
        >
          <Shield className="h-3.5 w-3.5" />
          <span>All Intel</span>
          <span className="rounded-full bg-slate-800/80 px-1.5 py-0.2 text-[10px] text-slate-300 font-mono">
            {counts.all}
          </span>
        </button>

        <button
          onClick={() => onScopeChange("MINE")}
          className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-medium transition-all ${
            selectedScope === "MINE"
              ? "bg-cyan-500/15 text-cyan-300 border border-cyan-500/40 shadow-sm shadow-cyan-950"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent"
          }`}
        >
          <Lock className="h-3.5 w-3.5" />
          <span>Private Dossier</span>
          <span className="rounded-full bg-slate-800/80 px-1.5 py-0.2 text-[10px] text-slate-300 font-mono">
            {counts.mine}
          </span>
        </button>

        <button
          onClick={() => onScopeChange("SHARED")}
          className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-medium transition-all ${
            selectedScope === "SHARED"
              ? "bg-purple-500/15 text-purple-300 border border-purple-500/40 shadow-sm shadow-purple-950"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent"
          }`}
        >
          <Share2 className="h-3.5 w-3.5" />
          <span>Squad Shared</span>
          <span className="rounded-full bg-slate-800/80 px-1.5 py-0.2 text-[10px] text-slate-300 font-mono">
            {counts.shared}
          </span>
        </button>

        <button
          onClick={() => onScopeChange("INVESTIGATION_WIDE")}
          className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-medium transition-all ${
            selectedScope === "INVESTIGATION_WIDE"
              ? "bg-blue-500/15 text-blue-300 border border-blue-500/40 shadow-sm shadow-blue-950"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent"
          }`}
        >
          <Globe className="h-3.5 w-3.5" />
          <span>Global Telemetry</span>
          <span className="rounded-full bg-slate-800/80 px-1.5 py-0.2 text-[10px] text-slate-300 font-mono">
            {counts.investigationWide}
          </span>
        </button>
      </div>

      {/* Search and Category Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search Bar */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by code, title, or evidence metadata..."
            className="w-full rounded-lg border border-slate-800 bg-[#0c1222]/90 pl-9 pr-9 py-2 text-xs text-slate-200 placeholder-slate-500 focus:border-cyan-500/60 focus:outline-none focus:ring-1 focus:ring-cyan-500/60"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Type Select Dropdown */}
        <div className="relative min-w-[180px]">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
            <Filter className="h-3.5 w-3.5" />
          </div>
          <select
            value={selectedType || ""}
            onChange={(e) =>
              onTypeChange(e.target.value ? (e.target.value as ClueType) : undefined)
            }
            className="w-full appearance-none rounded-lg border border-slate-800 bg-[#0c1222]/90 pl-9 pr-8 py-2 text-xs text-slate-200 focus:border-cyan-500/60 focus:outline-none focus:ring-1 focus:ring-cyan-500/60 cursor-pointer"
          >
            <option value="">All Forensic Types</option>
            {CLUE_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};
