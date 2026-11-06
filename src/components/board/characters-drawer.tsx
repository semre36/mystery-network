"use client";

import React, { useState, useEffect } from "react";
import { UserCheck, Plus, X, Search, Loader2 } from "lucide-react";

interface CaseCharacterDto {
  id: string;
  name: string;
  description: string;
  role?: string | null;
  clearance?: string | null;
  location?: string | null;
}

interface CharactersDrawerProps {
  investigationId: string;
  isOpen: boolean;
  onClose: () => void;
  onPinCharacter: (character: CaseCharacterDto) => void;
}

export function CharactersDrawer({
  investigationId,
  isOpen,
  onClose,
  onPinCharacter,
}: CharactersDrawerProps) {
  const [characters, setCharacters] = useState<CaseCharacterDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;

    fetch(`/api/investigations/${investigationId}`)
      .then((res) => res.json())
      .then((json) => {
        if (isMounted && json.ok) {
          setCharacters(json.data.characters || []);
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

  const filtered = characters.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.role && c.role.toLowerCase().includes(search.toLowerCase())) ||
      c.description.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-y-0 left-0 z-40 w-80 sm:w-96 bg-[#090f1a] border-r border-[#1a253c] shadow-2xl flex flex-col animate-slideInLeft">
      {/* Header */}
      <div className="p-4 border-b border-[#18233a] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <UserCheck className="w-4 h-4 text-amber-400" />
          <h3 className="text-sm font-semibold text-slate-100 font-sans">
            Persons of Interest Dossiers
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

      {/* Search */}
      <div className="p-3 border-b border-[#141c2e]">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search suspect names, roles..."
            className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-[#0d1424] border border-[#1d2a44] text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-amber-500 font-sans"
          />
        </div>
      </div>

      {/* Characters list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-48 text-slate-500 gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-amber-500" />
            <span className="text-xs font-mono">Loading dossier registry...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-slate-500 font-mono text-xs">
            {search ? "No matching dossiers found." : "No case suspects/witnesses attached."}
          </div>
        ) : (
          filtered.map((char) => (
            <div
              key={char.id}
              className="p-3 rounded-xl bg-[#14110b] border border-[#2b2214] hover:border-amber-500/50 transition-all space-y-2 group"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="text-xs font-semibold text-slate-200 font-sans">{char.name}</h4>
                  {char.role && (
                    <span className="text-[10px] font-mono text-amber-400 block mt-0.5">
                      {char.role}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => onPinCharacter(char)}
                  className="px-2 py-1 rounded-lg bg-amber-950/80 hover:bg-amber-900 border border-amber-700/50 text-amber-300 text-[10px] font-mono font-semibold flex items-center gap-1 shrink-0 transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  <span>Pin</span>
                </button>
              </div>

              <p className="text-[11px] text-slate-400 line-clamp-3 leading-relaxed">
                {char.description}
              </p>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-[#141c2e] text-[10px] font-mono text-slate-500 text-center">
        Click &quot;Pin&quot; to place suspect polaroid onto board
      </div>
    </div>
  );
}
