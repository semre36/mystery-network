import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CaseService } from "@/modules/cases/services/case.service";
import { StartInvestigationButton } from "@/components/investigations/start-investigation-button";
import {
  ChevronLeft,
  Clock,
  Users,
  ShieldAlert,
  BookOpen,
  Lock,
  Unlock,
  UserCheck,
  FileText,
  Radio,
  ExternalLink,
  Layers,
  Sparkles,
} from "lucide-react";
import { CaseDifficulty } from "@prisma/client";

export const dynamic = "force-dynamic";

interface CaseDetailPageProps {
  params: Promise<{ caseId: string }>;
}

const DIFFICULTY_CONFIG: Record<
  CaseDifficulty,
  { label: string; bg: string; border: string; text: string }
> = {
  EASY: {
    label: "Level 1 • Low Threat",
    bg: "bg-emerald-950/40",
    border: "border-emerald-800/50",
    text: "text-emerald-400",
  },
  MEDIUM: {
    label: "Level 2 • Moderate Threat",
    bg: "bg-amber-950/40",
    border: "border-amber-800/50",
    text: "text-amber-400",
  },
  HARD: {
    label: "Level 3 • High Threat",
    bg: "bg-orange-950/40",
    border: "border-orange-800/50",
    text: "text-orange-400",
  },
  EXPERT: {
    label: "Level 4 • Maximum Severity",
    bg: "bg-rose-950/40",
    border: "border-rose-800/50",
    text: "text-rose-400",
  },
};

export async function generateMetadata({ params }: CaseDetailPageProps) {
  const { caseId } = await params;
  try {
    const caseData = await CaseService.getCaseByIdOrCode(caseId);
    return {
      title: `${caseData.caseCode}: ${caseData.title} | MYSTERY NETWORK`,
      description: caseData.description,
    };
  } catch {
    return {
      title: "Classified Case Dossier | MYSTERY NETWORK",
    };
  }
}

export default async function CaseDetailPage({ params }: CaseDetailPageProps) {
  const { caseId } = await params;

  let caseData;
  try {
    caseData = await CaseService.getCaseByIdOrCode(caseId);
  } catch {
    notFound();
  }

  const diff = DIFFICULTY_CONFIG[caseData.difficulty] ?? DIFFICULTY_CONFIG.MEDIUM;

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      {/* Back Navigation */}
      <div>
        <Link
          href="/cases"
          className="inline-flex items-center gap-1.5 text-xs font-mono text-slate-400 hover:text-cyan-300 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>RETURN TO CASE ARCHIVE</span>
        </Link>
      </div>

      {/* Primary Dossier Header */}
      <div className="rounded-2xl bg-gradient-to-br from-[#0c1424] via-[#09101d] to-[#070b16] border border-[#1d2a45] p-6 md:p-8 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-semibold text-cyan-400 px-2.5 py-1 rounded bg-cyan-950/60 border border-cyan-800/60">
              {caseData.caseCode}
            </span>
            <span
              className={`font-mono text-[11px] uppercase tracking-wider px-2.5 py-1 rounded border ${diff.bg} ${diff.border} ${diff.text}`}
            >
              {diff.label}
            </span>
          </div>

          <div className="flex items-center gap-2 font-mono text-[11px] text-slate-500">
            <span>STATUS:</span>
            <span className="text-emerald-400 font-semibold uppercase">ACTIVE DISPATCH</span>
            {caseData.publishedAt && (
              <>
                <span>&bull;</span>
                <span>DE-CLASSIFIED: {new Date(caseData.publishedAt).toLocaleDateString()}</span>
              </>
            )}
          </div>
        </div>

        <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight mb-4 font-sans">
          {caseData.title}
        </h1>

        <p className="text-sm md:text-base text-slate-300 leading-relaxed max-w-3xl mb-6">
          {caseData.description}
        </p>

        {/* Intelligence Specs Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-[#18233a]">
          <div className="p-3 rounded-lg bg-[#090f1b] border border-[#162035]">
            <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
              <Clock className="w-3 h-3 text-cyan-400" />
              Duration
            </div>
            <div className="text-xs font-mono font-semibold text-slate-200">
              {caseData.estimatedDurationMinutes} Minutes
            </div>
          </div>

          <div className="p-3 rounded-lg bg-[#090f1b] border border-[#162035]">
            <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
              <Users className="w-3 h-3 text-cyan-400" />
              Squad Size
            </div>
            <div className="text-xs font-mono font-semibold text-slate-200">
              {caseData.minPlayers === caseData.maxPlayers
                ? `${caseData.minPlayers} Operative`
                : `${caseData.minPlayers}–${caseData.maxPlayers} Operatives`}
            </div>
          </div>

          <div className="p-3 rounded-lg bg-[#090f1b] border border-[#162035]">
            <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
              <Layers className="w-3 h-3 text-cyan-400" />
              Tactical Acts
            </div>
            <div className="text-xs font-mono font-semibold text-slate-200">
              {caseData.chapterCount} Chapters
            </div>
          </div>

          <div className="p-3 rounded-lg bg-[#090f1b] border border-[#162035]">
            <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
              <BookOpen className="w-3 h-3 text-cyan-400" />
              Campaign
            </div>
            <div className="text-xs font-mono font-semibold text-cyan-300 truncate">
              {caseData.campaign ? (
                <Link
                  href={`/campaigns/${caseData.campaign.slug}`}
                  className="hover:underline flex items-center gap-1"
                >
                  <span className="truncate">{caseData.campaign.title}</span>
                  <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                </Link>
              ) : (
                "Standalone Mystery"
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Investigation Action Box */}
      <div className="rounded-xl bg-gradient-to-r from-blue-950/40 via-[#0d1627] to-cyan-950/40 border border-blue-500/40 p-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Radio className="w-4 h-4 text-cyan-400 animate-pulse" />
            <h3 className="text-sm font-semibold text-white font-sans">
              Investigation Deployment Ready
            </h3>
          </div>
          <p className="text-xs text-slate-300 max-w-xl">
            Dispatch an operational field unit to begin your investigation. All chapter progression,
            telemetry analysis, and timestamps are persisted to your operative profile.
          </p>
        </div>

        <StartInvestigationButton caseCode={caseData.caseCode} />
      </div>

      {/* Characters of Interest / Dossiers */}
      <section aria-label="Characters of Interest">
        <div className="flex items-center justify-between pb-3 border-b border-[#182236] mb-4">
          <div className="flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-cyan-400" />
            <h2 className="text-base font-semibold text-white font-sans">
              Persons of Interest & Witnesses ({caseData.characters.length})
            </h2>
          </div>
          <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">
            Public Intelligence Record
          </span>
        </div>

        {caseData.characters.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {caseData.characters.map((character) => (
              <div
                key={character.id}
                className="rounded-xl bg-[#0d1424] border border-[#1e2a42] p-4 space-y-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="text-sm font-semibold text-slate-100 font-sans">
                      {character.name}
                    </h4>
                    {character.role && (
                      <span className="text-[11px] font-mono text-cyan-400 block">
                        {character.role}
                      </span>
                    )}
                  </div>
                  {character.clearance && (
                    <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-red-950/40 border border-red-800/50 text-red-300 uppercase tracking-wider shrink-0">
                      {character.clearance}
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-400 leading-relaxed">{character.description}</p>

                {character.location && (
                  <div className="text-[10px] font-mono text-slate-500 pt-1">
                    Last known locale: <span className="text-slate-300">{character.location}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-lg bg-[#0d1424] border border-[#1e2a42] p-6 text-center text-xs font-mono text-slate-400">
            No public personnel records attached to this classified file.
          </div>
        )}
      </section>

      {/* Investigation Chapters / Acts */}
      <section aria-label="Investigation Acts">
        <div className="flex items-center justify-between pb-3 border-b border-[#182236] mb-4">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-cyan-400" />
            <h2 className="text-base font-semibold text-white font-sans">
              Investigation Acts & Chronology ({caseData.chapters.length})
            </h2>
          </div>
          <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">
            Sequential Mission Path
          </span>
        </div>

        <div className="space-y-3">
          {caseData.chapters.map((chapter) => (
            <div
              key={chapter.id}
              className={`rounded-xl border p-4 transition-colors ${
                chapter.isLocked
                  ? "bg-[#0a0f1b] border-[#151f33] text-slate-500"
                  : "bg-[#0d1424] border-[#1e2a42] text-slate-300"
              }`}
            >
              <div className="flex items-center justify-between gap-3 mb-2">
                <div className="flex items-center gap-2.5">
                  <span className="font-mono text-xs px-2 py-0.5 rounded bg-[#131b2e] border border-[#212d47] text-cyan-400 font-semibold">
                    Act {chapter.chapterOrder}
                  </span>
                  <h4 className="text-sm font-semibold text-slate-100 font-sans">
                    {chapter.title}
                  </h4>
                </div>

                {chapter.isLocked ? (
                  <span className="flex items-center gap-1 text-[10px] font-mono text-slate-500 px-2 py-0.5 rounded bg-[#0f172a] border border-[#1e293b]">
                    <Lock className="w-3 h-3 text-slate-500" />
                    <span>Progression Locked</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[10px] font-mono text-emerald-400 px-2 py-0.5 rounded bg-emerald-950/40 border border-emerald-800/50">
                    <Unlock className="w-3 h-3 text-emerald-400" />
                    <span>Briefing Available</span>
                  </span>
                )}
              </div>

              <p className="text-xs text-slate-400 leading-relaxed">{chapter.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Classified Intelligence Security Banner */}
      <div className="rounded-xl bg-[#0a0f1c] border border-amber-900/30 p-4 flex items-start gap-3">
        <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h4 className="text-xs font-semibold font-mono text-amber-300 uppercase tracking-wider">
            Operational Security Protocol (OPSEC)
          </h4>
          <p className="text-xs text-slate-400 leading-relaxed">
            All forensic telemetry, evidence manifests, cryptographic hashes, and suspect
            interrogations are restricted. Evidence and puzzle access require an authenticated
            active investigation session.
          </p>
        </div>
      </div>
    </div>
  );
}
