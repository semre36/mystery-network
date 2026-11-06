"use client";

import React, { useState, useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Search, Filter, ArrowUpDown, X, Loader2 } from "lucide-react";
import { CaseDifficulty } from "@prisma/client";

interface CaseSearchFiltersProps {
  initialSearch?: string;
  initialDifficulty?: string;
  initialSortBy?: string;
}

export function CaseSearchFilters({
  initialSearch = "",
  initialDifficulty = "",
  initialSortBy = "newest",
}: CaseSearchFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [search, setSearch] = useState(initialSearch);
  const [difficulty, setDifficulty] = useState(initialDifficulty);
  const [sortBy, setSortBy] = useState(initialSortBy);

  const applyFilters = (newParams: { search?: string; difficulty?: string; sortBy?: string }) => {
    const params = new URLSearchParams(searchParams.toString());

    // Update search
    const updatedSearch = newParams.search !== undefined ? newParams.search : search;
    if (updatedSearch.trim()) {
      params.set("search", updatedSearch.trim());
    } else {
      params.delete("search");
    }

    // Update difficulty
    const updatedDiff = newParams.difficulty !== undefined ? newParams.difficulty : difficulty;
    if (updatedDiff) {
      params.set("difficulty", updatedDiff);
    } else {
      params.delete("difficulty");
    }

    // Update sortBy
    const updatedSort = newParams.sortBy !== undefined ? newParams.sortBy : sortBy;
    if (updatedSort && updatedSort !== "newest") {
      params.set("sortBy", updatedSort);
    } else {
      params.delete("sortBy");
    }

    // Reset to page 1 on filter change
    params.delete("page");

    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    applyFilters({ search });
  };

  const handleDifficultyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setDifficulty(val);
    applyFilters({ difficulty: val });
  };

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSortBy(val);
    applyFilters({ sortBy: val });
  };

  const handleClear = () => {
    setSearch("");
    setDifficulty("");
    setSortBy("newest");
    startTransition(() => {
      router.push(pathname);
    });
  };

  const hasActiveFilters = Boolean(search || difficulty || (sortBy && sortBy !== "newest"));

  return (
    <div className="rounded-xl bg-[#0d1424] border border-[#1e2a42] p-4 shadow-sm mb-6">
      <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
        {/* Search Bar */}
        <form onSubmit={handleSearchSubmit} className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search dossier by codename, title, or keywords..."
            className="w-full pl-9 pr-8 py-2 rounded-lg bg-[#080d18] border border-[#1d273d] focus:border-cyan-500/70 focus:outline-none focus:ring-1 focus:ring-cyan-500/30 text-xs font-mono text-slate-200 placeholder:text-slate-500 transition-all"
          />
          {search && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                applyFilters({ search: "" });
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </form>

        {/* Filter Selectors */}
        <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
          {/* Difficulty Filter */}
          <div className="relative flex-1 sm:flex-none">
            <select
              value={difficulty}
              onChange={handleDifficultyChange}
              className="w-full sm:w-auto appearance-none pl-8 pr-8 py-2 rounded-lg bg-[#080d18] border border-[#1d273d] focus:border-cyan-500/70 text-xs font-mono text-slate-200 cursor-pointer transition-all"
            >
              <option value="">All Threat Levels</option>
              <option value={CaseDifficulty.EASY}>Level 1 • Low Threat</option>
              <option value={CaseDifficulty.MEDIUM}>Level 2 • Moderate</option>
              <option value={CaseDifficulty.HARD}>Level 3 • High Threat</option>
              <option value={CaseDifficulty.EXPERT}>Level 4 • Maximum Severity</option>
            </select>
            <Filter className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Sort Selector */}
          <div className="relative flex-1 sm:flex-none">
            <select
              value={sortBy}
              onChange={handleSortChange}
              className="w-full sm:w-auto appearance-none pl-8 pr-8 py-2 rounded-lg bg-[#080d18] border border-[#1d273d] focus:border-cyan-500/70 text-xs font-mono text-slate-200 cursor-pointer transition-all"
            >
              <option value="newest">Sort: Newest Dossiers</option>
              <option value="oldest">Sort: Oldest Dossiers</option>
              <option value="title">Sort: Codename / Title</option>
              <option value="difficulty">Sort: Threat Tier</option>
            </select>
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Clear Filters Reset */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleClear}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#141b2e] hover:bg-[#1a253d] border border-[#23314f] text-slate-300 hover:text-slate-100 text-xs font-mono transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          )}

          {/* Pending indicator */}
          {isPending && (
            <div className="flex items-center text-cyan-400 pl-1">
              <Loader2 className="w-4 h-4 animate-spin" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
