import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CaseService } from "@/modules/cases/services/case.service";
import { CaseCard } from "@/components/cases/case-card";
import { ChevronLeft, FolderGit2, Layers, AlertCircle } from "lucide-react";

export const dynamic = "force-dynamic";

interface CampaignDetailPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: CampaignDetailPageProps) {
  const { slug } = await params;
  try {
    const campaign = await CaseService.getCampaignBySlug(slug);
    return {
      title: `${campaign.title} | Campaigns | MYSTERY NETWORK`,
      description: campaign.description,
    };
  } catch {
    return {
      title: "Classified Campaign | MYSTERY NETWORK",
    };
  }
}

export default async function CampaignDetailPage({ params }: CampaignDetailPageProps) {
  const { slug } = await params;

  let campaign;
  try {
    campaign = await CaseService.getCampaignBySlug(slug);
  } catch {
    notFound();
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      {/* Back Link */}
      <div>
        <Link
          href="/campaigns"
          className="inline-flex items-center gap-1.5 text-xs font-mono text-slate-400 hover:text-cyan-300 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>RETURN TO CAMPAIGNS DIRECTORY</span>
        </Link>
      </div>

      {/* Campaign Header */}
      <div className="rounded-2xl bg-gradient-to-br from-[#0c1424] via-[#09101d] to-[#070b16] border border-[#1d2a45] p-6 md:p-8 shadow-xl">
        <div className="flex items-center gap-2 mb-3">
          <span className="font-mono text-[10px] text-cyan-400 uppercase tracking-widest px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-800/60">
            {campaign.slug}
          </span>
          <span className="text-[10px] font-mono text-blue-300 uppercase tracking-wider px-2 py-0.5 rounded bg-blue-950/50 border border-blue-800/60">
            Active Campaign Series
          </span>
        </div>

        <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight mb-3 font-sans">
          {campaign.title}
        </h1>

        <p className="text-sm md:text-base text-slate-300 leading-relaxed max-w-3xl mb-6">
          {campaign.description}
        </p>

        <div className="pt-4 border-t border-[#18233a] flex items-center gap-2 font-mono text-xs text-slate-400">
          <Layers className="w-4 h-4 text-cyan-400" />
          <span>
            {campaign.cases.length}{" "}
            {campaign.cases.length === 1 ? "Connected Case Dossier" : "Connected Case Dossiers"}
          </span>
        </div>
      </div>

      {/* Connected Cases Section */}
      <section aria-label="Campaign Case Files">
        <div className="flex items-center justify-between pb-3 border-b border-[#182236] mb-5">
          <div className="flex items-center gap-2">
            <FolderGit2 className="w-4 h-4 text-cyan-400" />
            <h2 className="text-base font-semibold text-white font-sans">
              Operational Dossiers in this Campaign ({campaign.cases.length})
            </h2>
          </div>
          <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">
            Chronological Release
          </span>
        </div>

        {campaign.cases.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {campaign.cases.map((caseItem) => (
              <CaseCard key={caseItem.id} caseData={caseItem} />
            ))}
          </div>
        ) : (
          <div className="rounded-xl bg-[#0d1424] border border-[#1e2a42] p-12 text-center max-w-lg mx-auto">
            <div className="w-12 h-12 rounded-full bg-cyan-950/40 border border-cyan-800/50 flex items-center justify-center mx-auto mb-4 text-cyan-400">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold text-white mb-2 font-sans">
              No Cases Published Yet
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Dossiers for this campaign are currently undergoing field preparation and security
              clearance.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
