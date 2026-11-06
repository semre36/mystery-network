"use client";

import { useEffect, useState } from "react";
import {
  BarChart3,
  Users,
  Compass,
  CheckCircle2,
  TrendingUp,
  BrainCircuit,
  Flame,
  Award,
} from "lucide-react";

interface AnalyticsData {
  totalUsers: number;
  totalInvestigations: number;
  activeInvestigations: number;
  solvedInvestigations: number;
  solveRatePercentage: number;
  totalPuzzlesSolved: number;
  popularCases: Array<{
    caseCode: string;
    title: string;
    investigationsCount: number;
  }>;
}

export function AdminAnalyticsView() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        const res = await fetch("/api/admin/analytics");
        const json = await res.json();
        if (json.ok) {
          setData(json.data.analytics);
        }
      } catch (e) {
        console.error("Failed to load analytics", e);
      } finally {
        setLoading(false);
      }
    }
    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-500 font-mono text-sm">
        Aggregating platform intelligence metrics...
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-12 text-center text-red-400 font-mono text-sm">
        Failed to retrieve platform analytics telemetry.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-mono tracking-tight text-slate-100 flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-indigo-400" />
          Platform Analytics & Intelligence
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Aggregated case engagement, puzzle resolution throughput, and deduction completion
          metrics.
        </p>
      </div>

      {/* Top Level Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-xl bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-mono font-medium">Registered Operatives</span>
            <Users className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-100">{data.totalUsers}</div>
          <div className="text-xs text-slate-500 mt-1">Platform-wide player base</div>
        </div>

        <div className="p-5 rounded-xl bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-mono font-medium">Total Investigations</span>
            <Compass className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-100">
            {data.totalInvestigations}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            {data.activeInvestigations} currently active
          </div>
        </div>

        <div className="p-5 rounded-xl bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-mono font-medium">Deduction Solve Rate</span>
            <TrendingUp className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-100">
            {data.solveRatePercentage}%
          </div>
          <div className="text-xs text-slate-500 mt-1">
            {data.solvedInvestigations} cases solved
          </div>
        </div>

        <div className="p-5 rounded-xl bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-mono font-medium">Puzzles Decrypted</span>
            <BrainCircuit className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-100">
            {data.totalPuzzlesSolved}
          </div>
          <div className="text-xs text-slate-500 mt-1">Individual challenge solves</div>
        </div>
      </div>

      {/* Popular Cases Leaderboard */}
      <div className="p-5 rounded-xl bg-slate-900 border border-slate-800">
        <h2 className="text-base font-bold font-mono text-slate-200 flex items-center gap-2 mb-4">
          <Flame className="w-4 h-4 text-amber-500" />
          Most Investigated Mystery Scenarios
        </h2>

        {data.popularCases.length === 0 ? (
          <p className="text-xs text-slate-500 font-mono">
            No case investigation sessions recorded yet.
          </p>
        ) : (
          <div className="space-y-3">
            {data.popularCases.map((c, idx) => (
              <div
                key={c.caseCode}
                className="p-3.5 rounded-lg bg-slate-950/60 border border-slate-800/80 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded bg-slate-800 font-mono text-xs font-bold text-slate-300 flex items-center justify-center">
                    #{idx + 1}
                  </div>
                  <div>
                    <div className="font-bold text-sm text-slate-200">{c.title}</div>
                    <div className="text-xs font-mono text-slate-500">{c.caseCode}</div>
                  </div>
                </div>

                <div className="text-right font-mono">
                  <div className="text-sm font-bold text-emerald-400">{c.investigationsCount}</div>
                  <div className="text-[10px] text-slate-500 uppercase">Sessions</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
