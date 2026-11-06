import React from "react";
import Link from "next/link";
import { getCurrentUser } from "@/modules/authentication/guards/auth.guard";
import { InvestigationService } from "@/modules/investigations/services/investigation.service";
import {
  InvestigationQuerySchema,
  type InvestigationQueryInput,
} from "@/modules/investigations/validation/investigation.schema";
import { InvestigationCard } from "@/components/investigations/investigation-card";
import { Radio, FolderSearch, AlertCircle, Plus } from "lucide-react";
import { InvestigationStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Active Field Operations | MYSTERY NETWORK",
  description: "View and resume your active and historical investigation sessions.",
};

interface InvestigationsPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function InvestigationsPage({ searchParams }: InvestigationsPageProps) {
  const user = await getCurrentUser();
  if (!user) return null;

  const resolvedParams = await searchParams;
  const rawQuery: Record<string, string> = {};
  for (const [key, val] of Object.entries(resolvedParams)) {
    if (typeof val === "string") {
      rawQuery[key] = val;
    } else if (Array.isArray(val) && val.length > 0) {
      rawQuery[key] = val[0];
    }
  }

  const parsed = InvestigationQuerySchema.safeParse(rawQuery);
  const filters: InvestigationQueryInput = parsed.success ? parsed.data : { page: 1, limit: 10 };

  const history = await InvestigationService.getPlayerInvestigations(user.id, filters);

  const activeTab = filters.status ?? "ALL";

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#182236]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-[10px] text-cyan-400 uppercase tracking-widest px-2 py-0.5 rounded bg-cyan-950/50 border border-cyan-800/60 flex items-center gap-1.5">
              <Radio className="w-2.5 h-2.5 animate-pulse text-cyan-400" />
              <span>Operational Field Sessions</span>
            </span>
            <span className="text-slate-500 text-xs font-mono">&bull;</span>
            <span className="text-slate-400 text-xs font-mono">Real-Time Progression</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight font-sans">
            Investigation Sessions
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Track active field assignments, resume paused investigations, and inspect solved or
            historical case files. All investigative actions remain synced to your operative
            dossier.
          </p>
        </div>

        <Link
          href="/cases"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-500/40 text-cyan-300 font-mono text-xs font-semibold transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>START NEW CASE</span>
        </Link>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-mono">
        <Link
          href="/investigations"
          className={`px-3 py-1.5 rounded-lg border transition-colors shrink-0 ${
            activeTab === "ALL"
              ? "bg-cyan-950/60 border-cyan-500/50 text-cyan-300 font-semibold"
              : "bg-[#0d1424] border-[#1e2a42] text-slate-400 hover:text-slate-200"
          }`}
        >
          All Sessions
        </Link>
        <Link
          href="/investigations?status=IN_PROGRESS"
          className={`px-3 py-1.5 rounded-lg border transition-colors shrink-0 ${
            activeTab === InvestigationStatus.IN_PROGRESS
              ? "bg-cyan-950/60 border-cyan-500/50 text-cyan-300 font-semibold"
              : "bg-[#0d1424] border-[#1e2a42] text-slate-400 hover:text-slate-200"
          }`}
        >
          Active
        </Link>
        <Link
          href="/investigations?status=PAUSED"
          className={`px-3 py-1.5 rounded-lg border transition-colors shrink-0 ${
            activeTab === InvestigationStatus.PAUSED
              ? "bg-amber-950/60 border-amber-600/50 text-amber-300 font-semibold"
              : "bg-[#0d1424] border-[#1e2a42] text-slate-400 hover:text-slate-200"
          }`}
        >
          Paused
        </Link>
        <Link
          href="/investigations?status=SOLVED"
          className={`px-3 py-1.5 rounded-lg border transition-colors shrink-0 ${
            activeTab === InvestigationStatus.SOLVED
              ? "bg-emerald-950/60 border-emerald-600/50 text-emerald-300 font-semibold"
              : "bg-[#0d1424] border-[#1e2a42] text-slate-400 hover:text-slate-200"
          }`}
        >
          Solved
        </Link>
      </div>

      {/* Grid of Sessions */}
      <section aria-label="Investigation History Catalog">
        {history.items.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {history.items.map((item) => (
              <InvestigationCard key={item.id} investigation={item} />
            ))}
          </div>
        ) : (
          <div className="rounded-xl bg-[#0d1424] border border-[#1e2a42] p-12 text-center max-w-lg mx-auto">
            <div className="w-12 h-12 rounded-full bg-cyan-950/40 border border-cyan-800/50 flex items-center justify-center mx-auto mb-4 text-cyan-400">
              <FolderSearch className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold text-white mb-2 font-sans">
              No Investigations Found
            </h3>
            <p className="text-xs text-slate-400 mb-6 leading-relaxed">
              {activeTab === "ALL"
                ? "You have not dispatched any investigation units yet. Browse the Case Archive to enter your first classified operation."
                : `No investigation sessions matching status '${activeTab}' were found.`}
            </p>
            <Link
              href="/cases"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-mono text-xs font-semibold transition-colors"
            >
              <span>EXPLORE CASE ARCHIVE</span>
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
