"use client";

import React from "react";
import {
  FileText,
  Camera,
  Headphones,
  Microscope,
  Key,
  FolderOpen,
  Lock,
  Share2,
  Globe,
  StickyNote,
  Paperclip,
  Clock,
  ArrowRight,
} from "lucide-react";
import { ClueType, AssignmentStatus } from "@prisma/client";
import type { SafeEvidenceSummaryDto } from "@/modules/evidence/types/evidence.types";

interface EvidenceCardProps {
  evidence: SafeEvidenceSummaryDto;
  onInspect: (evidenceId: string) => void;
}

const TYPE_ICONS: Record<ClueType, React.ElementType> = {
  DOCUMENT: FileText,
  PHOTOGRAPH: Camera,
  AUDIO_LOG: Headphones,
  FORENSIC_ITEM: Microscope,
  CIPHER_FRAGMENT: Key,
  TESTIMONY: FolderOpen,
};

const CLASSIFICATION_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  TOP_SECRET: {
    bg: "bg-rose-950/60",
    text: "text-rose-400",
    border: "border-rose-700/60",
  },
  SECRET: {
    bg: "bg-amber-950/60",
    text: "text-amber-400",
    border: "border-amber-700/60",
  },
  CONFIDENTIAL: {
    bg: "bg-yellow-950/60",
    text: "text-yellow-400",
    border: "border-yellow-700/60",
  },
  RESTRICTED: {
    bg: "bg-cyan-950/60",
    text: "text-cyan-300",
    border: "border-cyan-700/60",
  },
  PUBLIC: {
    bg: "bg-slate-900/60",
    text: "text-slate-300",
    border: "border-slate-700/60",
  },
};

export const EvidenceCard: React.FC<EvidenceCardProps> = ({ evidence, onInspect }) => {
  const IconComponent = TYPE_ICONS[evidence.clueType] || FileText;
  const classConfig =
    CLASSIFICATION_COLORS[evidence.classification] || CLASSIFICATION_COLORS.RESTRICTED;

  const isUnseen = evidence.assignmentStatus === AssignmentStatus.UNSEEN;

  return (
    <div
      onClick={() => onInspect(evidence.id)}
      className="group relative flex flex-col justify-between rounded-lg border border-slate-800 bg-[#0c1222]/90 p-5 shadow-lg transition-all duration-200 hover:border-cyan-500/50 hover:bg-[#0f172a] hover:shadow-cyan-950/20 cursor-pointer"
    >
      {/* Top Meta Bar */}
      <div>
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider border ${classConfig.bg} ${classConfig.text} ${classConfig.border}`}
            >
              {evidence.classification}
            </span>
            <span className="font-mono text-xs text-slate-400 font-medium">
              {evidence.clueCode}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {isUnseen && (
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
              </span>
            )}

            {evidence.accessType === "ASSIGNED" && (
              <span
                title="Assigned directly to your operative dossier"
                className="inline-flex items-center gap-1 rounded bg-cyan-950/40 px-2 py-0.5 text-[11px] text-cyan-300 border border-cyan-800/40"
              >
                <Lock className="h-3 w-3" /> Private
              </span>
            )}

            {evidence.accessType === "SHARED" && (
              <span
                title="Shared by fellow operative"
                className="inline-flex items-center gap-1 rounded bg-purple-950/50 px-2 py-0.5 text-[11px] text-purple-300 border border-purple-800/50"
              >
                <Share2 className="h-3 w-3" /> Shared
              </span>
            )}

            {evidence.accessType === "INVESTIGATION_WIDE" && (
              <span
                title="Available to all investigation units"
                className="inline-flex items-center gap-1 rounded bg-blue-950/40 px-2 py-0.5 text-[11px] text-blue-300 border border-blue-800/40"
              >
                <Globe className="h-3 w-3" /> Global
              </span>
            )}
          </div>
        </div>

        {/* Title and Icon */}
        <div className="flex items-start gap-3 mb-2">
          <div className="mt-0.5 rounded-md border border-slate-700/60 bg-slate-800/80 p-2 text-cyan-400 group-hover:border-cyan-500/40 group-hover:text-cyan-300 transition-colors">
            <IconComponent className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-100 group-hover:text-cyan-200 transition-colors line-clamp-1">
              {evidence.title}
            </h3>
            {evidence.chapterTitle && (
              <p className="text-[11px] text-slate-400 font-mono">{evidence.chapterTitle}</p>
            )}
          </div>
        </div>

        {/* Description snippet */}
        <p className="text-xs text-slate-300/80 line-clamp-2 leading-relaxed mb-4">
          {evidence.description}
        </p>
      </div>

      {/* Footer Info & Badges */}
      <div className="pt-3 border-t border-slate-800/70 flex items-center justify-between text-[11px] text-slate-400">
        <div className="flex items-center gap-3">
          {evidence.hasNote && (
            <span
              title="Personal field notes recorded"
              className="inline-flex items-center gap-1 text-amber-400 font-medium"
            >
              <StickyNote className="h-3.5 w-3.5" /> Note
            </span>
          )}

          {evidence.assetsCount > 0 && (
            <span
              title={`${evidence.assetsCount} attached forensic files`}
              className="inline-flex items-center gap-1 text-slate-400"
            >
              <Paperclip className="h-3.5 w-3.5" /> {evidence.assetsCount}
            </span>
          )}

          <span className="inline-flex items-center gap-1 text-slate-500">
            <Clock className="h-3 w-3" />
            {new Date(evidence.discoveredAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>

        <span className="inline-flex items-center gap-1 font-semibold text-cyan-400 group-hover:translate-x-0.5 transition-transform">
          Inspect <ArrowRight className="h-3 w-3" />
        </span>
      </div>
    </div>
  );
};
