import React from "react";
import Link from "next/link";
import { CaseService } from "@/modules/cases/services/case.service";
import { CampaignCard } from "@/components/campaigns/campaign-card";
import { FolderGit2, ChevronLeft, AlertCircle } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Classified Campaigns Directory | MYSTERY NETWORK",
  description:
    "Explore multi-act detective campaigns, interconnected global conspiracies, and overarching mysteries.",
};

export default async function CampaignsPage() {
  const campaigns = await CaseService.getPublishedCampaigns();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#182236]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-[10px] text-cyan-400 uppercase tracking-widest px-2 py-0.5 rounded bg-cyan-950/50 border border-cyan-800/60">
              Campaign Network
            </span>
            <span className="text-slate-500 text-xs font-mono">&bull;</span>
            <span className="text-slate-400 text-xs font-mono">Narrative Arcs</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight font-sans">
            Investigation Campaigns
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Multi-stage investigative narratives where clues from one case cross-reference into
            larger international syndicates, corporate sabotage, and geopolitical intrigues.
          </p>
        </div>

        <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-[#0c1322] border border-[#1b263e] shrink-0">
          <div className="p-2 rounded-lg bg-blue-950/50 text-cyan-400 border border-blue-800/40">
            <FolderGit2 className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
              Active Campaigns
            </div>
            <div className="text-sm font-semibold font-mono text-cyan-300">
              {campaigns.length} {campaigns.length === 1 ? "Campaign" : "Campaigns"}
            </div>
          </div>
        </div>
      </div>

      {/* Campaign Grid */}
      <section aria-label="Campaigns Catalog">
        {campaigns.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {campaigns.map((campaign) => (
              <CampaignCard key={campaign.id} campaign={campaign} />
            ))}
          </div>
        ) : (
          <div className="rounded-xl bg-[#0d1424] border border-[#1e2a42] p-12 text-center max-w-lg mx-auto">
            <div className="w-12 h-12 rounded-full bg-cyan-950/40 border border-cyan-800/50 flex items-center justify-center mx-auto mb-4 text-cyan-400">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold text-white mb-2 font-sans">
              No Published Campaigns Available
            </h3>
            <p className="text-xs text-slate-400 mb-6 leading-relaxed">
              No overarching campaign narratives are currently declassified. Check back as new
              global storylines are authorized for release.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
