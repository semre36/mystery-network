"use client";

import React, { useState, useEffect } from "react";
import { FileText, Plus, X, Search, Loader2 } from "lucide-react";
import { SafeEvidenceSummaryDto } from "@/modules/evidence/types/evidence.types";

interface EvidenceDrawerProps {
  investigationId: string;
  isOpen: boolean;
  onClose: () => void;
  onPinEvidence: (clue: SafeEvidenceSummaryDto) => void;
}

export function EvidenceDrawer({
  investigationId,
  isOpen,
  onClose,
  onPinEvidence,
}: EvidenceDrawerProps) {
  const [evidenceList, setEvidenceList] = useState<SafeEvidenceSummaryDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;

    fetch(`/api/investigations/${investigationId}/evidence?limit=50`)
      .then((res) => res.json())
      .then((json) => {
        if (isMounted && json.ok) {
          setEvidenceList(json.data.items || []);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [investigationId, isOpen]);

  if (!isOpen) return null;

  const filtered = evidenceList.filter(
    (e) =>
      e.title.toLowerCase().includes(search.toLowerCase()) ||
      (e.clueCode && e.clueCode.toLowerCase().includes(search.toLowerCase())) ||
      e.clueType.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-y-0 left-0 z-40 w-80 sm:w-96 bg-[#090f1a] border-r border-[#1a253c] shadow-2xl flex flex-col animate-slideInLeft">
      {/* Drawer Header */}
      <div className="p-4 border-b border-[#18233a] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-cyan-400" />
          <h3 className="text-sm font-semibold text-slate-100 font-sans">
            Declassified Evidence Vault
          </h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Search Filter */}
      <div className="p-3 border-b border-[#141c2e]">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search evidence codes, titles..."
            className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-[#0d1424] border border-[#1d2a44] text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 font-sans"
          />
        </div>
      </div>

      {/* Evidence List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-48 text-slate-500 gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-cyan-500" />
            <span className="text-xs font-mono">Accessing encrypted archives...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-slate-500 font-mono text-xs">
            {search ? "No matching evidence items found." : "No declassified clues available yet."}
          </div>
        ) : (
          filtered.map((item) => (
            <div
              key={item.id}
              className="p-3 rounded-xl bg-[#0c1424] border border-[#1a253c] hover:border-cyan-500/50 transition-all space-y-2 group"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-800/40">
                    {item.clueCode || item.clueType}
                  </span>
                  <h4 className="text-xs font-semibold text-slate-200 font-sans mt-1">
                    {item.title}
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => onPinEvidence(item)}
                  className="px-2 py-1 rounded-lg bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-700/50 text-cyan-300 text-[10px] font-mono font-semibold flex items-center gap-1 shrink-0 transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  <span>Pin</span>
                </button>
              </div>

              <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                {item.description}
              </p>
            </div>
          ))
        )}
      </div>

      {/* Drawer Footer */}
      <div className="p-3 border-t border-[#141c2e] text-[10px] font-mono text-slate-500 text-center">
        Click &quot;Pin&quot; to place clue card onto corkboard
      </div>
    </div>
  );
}
