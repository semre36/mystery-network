"use client";

import React, { useState } from "react";
import { Award, CheckCircle2, Lock, Sparkles, Shield, Filter } from "lucide-react";
import { AchievementCategory } from "@prisma/client";
import type { SafeAchievementDto } from "@/modules/progression/types/progression.types";

interface AchievementsViewProps {
  achievements: SafeAchievementDto[];
}

export function AchievementsView({ achievements }: AchievementsViewProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");

  const categories = ["ALL", "DEDUCTION", "PUZZLES", "TEAMWORK", "SPECIAL_EVENTS"];

  const filtered = achievements.filter((ach) =>
    selectedCategory === "ALL" ? true : ach.category === selectedCategory
  );

  const unlockedCount = achievements.filter((a) => a.isUnlocked).length;

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* 1. Top Header Box */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-[#0c1426] via-[#09101e] to-[#070b16] border border-[#1e2a44] shadow-2xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-mono text-purple-400 uppercase tracking-wider font-bold">
            NETWORK COMMENDATION REGISTRY
          </span>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-100 font-sans mt-1">
            Investigator Accolades & Badges
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 max-w-xl font-sans mt-1 leading-relaxed">
            Proof of operational mastery, forensic deduction accuracy, and syndicate
            neutralizations.
          </p>
        </div>

        <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-[#080e1c] border border-purple-500/30 min-w-[130px]">
          <span className="text-[10px] font-mono uppercase text-slate-400">Total Unlocked</span>
          <div className="text-3xl font-extrabold font-mono text-purple-400 my-1">
            {unlockedCount} / {achievements.length}
          </div>
          <span className="text-[10px] font-mono text-slate-500">
            {Math.round((unlockedCount / (achievements.length || 1)) * 100)}% Milestone
          </span>
        </div>
      </div>

      {/* 2. Category Filter Pills */}
      <div className="flex flex-wrap items-center gap-2">
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setSelectedCategory(cat)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-mono transition-colors ${
              selectedCategory === cat
                ? "bg-purple-600 text-white font-bold shadow-md shadow-purple-950/40"
                : "bg-[#0c1322] hover:bg-[#141f36] border border-[#1a263e] text-slate-400"
            }`}
          >
            {cat.replace("_", " ")}
          </button>
        ))}
      </div>

      {/* 3. Achievements Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((ach) => {
          return (
            <div
              key={ach.id}
              className={`p-5 rounded-2xl border transition-all flex flex-col justify-between ${
                ach.isUnlocked
                  ? "bg-gradient-to-br from-[#120d24] via-[#0d1222] to-[#080d1a] border-purple-500/60 shadow-lg shadow-purple-950/30"
                  : "bg-[#090f1b] border-[#162238] opacity-75"
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                      ach.isUnlocked
                        ? "bg-purple-950/80 border border-purple-500 text-purple-300"
                        : "bg-slate-900 border border-slate-700 text-slate-500"
                    }`}
                  >
                    {ach.isUnlocked ? (
                      <Award className="w-5 h-5 text-purple-400" />
                    ) : (
                      <Lock className="w-4 h-4 text-slate-500" />
                    )}
                  </div>

                  <span className="text-[9px] font-mono uppercase px-2 py-0.5 rounded bg-[#070b14] border border-white/5 text-slate-400">
                    {ach.category}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-slate-100 font-sans mb-1">{ach.title}</h3>
                <p className="text-xs text-slate-400 font-sans leading-relaxed">
                  {ach.description}
                </p>
              </div>

              <div className="pt-4 mt-4 border-t border-white/5 flex items-center justify-between text-[11px] font-mono">
                {ach.isUnlocked ? (
                  <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>
                      Unlocked {ach.unlockedAt ? new Date(ach.unlockedAt).toLocaleDateString() : ""}
                    </span>
                  </span>
                ) : (
                  <span className="text-slate-500 flex items-center gap-1">
                    <Lock className="w-3 h-3" />
                    <span>Classified Requirement</span>
                  </span>
                )}

                <span className="text-[10px] text-slate-500 uppercase">{ach.code}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
