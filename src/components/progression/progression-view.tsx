"use client";

import React from "react";
import Link from "next/link";
import {
  TrendingUp,
  Award,
  Shield,
  Layers,
  History,
  CheckCircle2,
  ChevronRight,
  Zap,
} from "lucide-react";
import type { PlayerProgressionDto } from "@/modules/progression/types/progression.types";

interface ProgressionViewProps {
  progression: PlayerProgressionDto;
}

export function ProgressionView({ progression }: ProgressionViewProps) {
  const { levelProgress, rank } = progression;

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* 1. Header & Clearance Banner */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-[#0c1426] via-[#09101e] to-[#070b16] border border-[#1e2a44] shadow-2xl relative overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono uppercase px-2.5 py-1 rounded bg-cyan-950/80 border border-cyan-700/60 text-cyan-300 font-bold">
                {rank.clearanceLevel}
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                BADGE: {rank.badge}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-100 font-sans">
              Operative Level {progression.level}: {rank.title}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-xl font-sans leading-relaxed">
              {rank.description}
            </p>
          </div>

          {/* Big XP Box */}
          <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-[#070d18]/90 border border-cyan-500/30 shadow-lg min-w-[140px]">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
              Total Acquired XP
            </span>
            <div className="flex items-baseline gap-1 my-1">
              <span className="text-3xl font-extrabold font-mono text-cyan-400">
                {progression.totalXP.toLocaleString()}
              </span>
            </div>
            <span className="text-[10px] font-mono text-slate-400">
              {levelProgress.xpNeededForNextLevel} XP to Level {levelProgress.nextLevel}
            </span>
          </div>
        </div>

        {/* Level Progress Bar */}
        <div className="mt-6 pt-5 border-t border-white/5 space-y-2">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-slate-400">Level {progression.level} ({levelProgress.currentLevelMinXP} XP)</span>
            <span className="text-cyan-300 font-bold">{levelProgress.progressPercent}% Calibrated</span>
            <span className="text-slate-400">Level {levelProgress.nextLevel} ({levelProgress.nextLevelMinXP} XP)</span>
          </div>

          <div className="w-full h-3 rounded-full bg-[#050a14] border border-[#141e30] overflow-hidden p-0.5">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-600 via-cyan-400 to-emerald-400 transition-all duration-500 shadow-sm shadow-cyan-500/50"
              style={{ width: `${levelProgress.progressPercent}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* 2. Key Metrics Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-[#09101e] border border-[#16233a] space-y-1">
          <span className="text-[10px] font-mono uppercase text-slate-500">Cases Solved</span>
          <div className="text-2xl font-bold font-mono text-emerald-400">
            {progression.completedInvestigationsCount}
          </div>
          <span className="text-[11px] text-slate-400">Concluded mystery sessions</span>
        </div>

        <div className="p-5 rounded-2xl bg-[#09101e] border border-[#16233a] space-y-1">
          <span className="text-[10px] font-mono uppercase text-slate-500">Commendation Ribbons</span>
          <div className="text-2xl font-bold font-mono text-purple-400">
            {progression.unlockedAchievementsCount} / {progression.totalAchievementsCount}
          </div>
          <Link
            href="/profile/achievements"
            className="text-[11px] font-mono text-purple-400 hover:text-purple-300 inline-flex items-center gap-1"
          >
            <span>View registry</span>
            <ChevronRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="p-5 rounded-2xl bg-[#09101e] border border-[#16233a] space-y-1">
          <span className="text-[10px] font-mono uppercase text-slate-500">Operational Clearance</span>
          <div className="text-lg font-bold font-sans text-cyan-300 mt-1">
            {rank.title}
          </div>
          <span className="text-[11px] text-slate-400">Full platform inquiry</span>
        </div>
      </div>

      {/* 3. Auditable XP Transaction History */}
      <section className="p-6 rounded-2xl bg-[#09101e] border border-[#16233a] space-y-4">
        <div className="flex items-center justify-between border-b border-[#141e30] pb-3">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-cyan-400" />
            <h3 className="text-xs font-mono text-slate-200 uppercase tracking-wider">
              Auditable Reward Ledger ({progression.recentTransactions.length} Transactions)
            </h3>
          </div>
          <span className="text-[10px] font-mono text-slate-500">Idempotent Cryptographic Records</span>
        </div>

        {progression.recentTransactions.length === 0 ? (
          <div className="text-center py-8 text-slate-500 font-mono text-xs">
            No XP transactions recorded yet. Complete investigations or solve cipher minigames to earn intelligence credits.
          </div>
        ) : (
          <div className="divide-y divide-white/5 space-y-0">
            {progression.recentTransactions.map((tx) => (
              <div
                key={tx.id}
                className="py-3 flex flex-wrap items-center justify-between gap-3 text-xs"
              >
                <div className="space-y-0.5">
                  <p className="font-semibold text-slate-200 font-sans">{tx.reason}</p>
                  <p className="text-[10px] font-mono text-slate-500">
                    {new Date(tx.createdAt).toLocaleDateString()} at {new Date(tx.createdAt).toLocaleTimeString()}
                    {tx.referenceKey && ` • Ref: ${tx.referenceKey}`}
                  </p>
                </div>

                <span className="px-2.5 py-1 rounded bg-emerald-950/60 border border-emerald-800/80 text-emerald-400 font-mono font-bold">
                  +{tx.amount} XP
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
