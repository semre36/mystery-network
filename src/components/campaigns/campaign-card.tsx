import React from "react";
import Link from "next/link";
import { FolderGit2, BookOpen, Layers, ArrowRight } from "lucide-react";
import type { SafeCampaignSummaryDto } from "@/modules/cases/types/case.types";

interface CampaignCardProps {
  campaign: SafeCampaignSummaryDto;
}

export function CampaignCard({ campaign }: CampaignCardProps) {
  return (
    <div className="group relative rounded-xl bg-[#0d1424] border border-[#1e2a42] hover:border-cyan-500/40 p-5 flex flex-col justify-between transition-all duration-300 hover:shadow-[0_0_25px_rgba(6,182,212,0.1)]">
      <div>
        {/* Campaign Header */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-[#131d33] border border-[#213050] text-cyan-400">
              <FolderGit2 className="w-4 h-4" />
            </div>
            <span className="font-mono text-xs text-slate-400 uppercase tracking-wider">
              {campaign.slug}
            </span>
          </div>

          <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-blue-950/50 border border-blue-800/60 text-blue-300 uppercase tracking-wider">
            Operational
          </span>
        </div>

        {/* Title */}
        <h3 className="text-base font-semibold text-slate-100 group-hover:text-cyan-200 transition-colors mb-2 font-sans">
          {campaign.title}
        </h3>

        {/* Description */}
        <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed mb-4">
          {campaign.description}
        </p>
      </div>

      {/* Footer */}
      <div className="pt-4 border-t border-[#192338] flex items-center justify-between">
        <div className="flex items-center gap-1.5 font-mono text-xs text-slate-400">
          <Layers className="w-3.5 h-3.5 text-cyan-500" />
          <span>
            {campaign.caseCount} {campaign.caseCount === 1 ? "Case Dossier" : "Case Dossiers"}
          </span>
        </div>

        <Link
          href={`/campaigns/${campaign.slug}`}
          className="inline-flex items-center gap-1.5 text-xs font-mono text-cyan-400 hover:text-cyan-300 font-semibold transition-colors"
        >
          <span>VIEW CAMPAIGN</span>
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>
    </div>
  );
}
