import React from "react";
import { CaseService } from "@/modules/cases/services/case.service";
import { CaseQuerySchema, type CaseQueryInput } from "@/modules/cases/validation/case-query.schema";
import { CaseCard } from "@/components/cases/case-card";
import { CaseSearchFilters } from "@/components/cases/case-search-filters";
import { CasePagination } from "@/components/cases/case-pagination";
import { FeaturedCaseBanner } from "@/components/cases/featured-case-banner";
import { FolderSearch, AlertCircle, Shield } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Classified Case Archive | MYSTERY NETWORK",
  description:
    "Explore operational mystery dossiers, classified investigations, and collaborative detective cases.",
};

interface CasesPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function CasesPage({ searchParams }: CasesPageProps) {
  const resolvedParams = await searchParams;

  const rawFilters: Record<string, string> = {};
  for (const [key, val] of Object.entries(resolvedParams)) {
    if (typeof val === "string") {
      rawFilters[key] = val;
    } else if (Array.isArray(val) && val.length > 0) {
      rawFilters[key] = val[0];
    }
  }

  const parsed = CaseQuerySchema.safeParse(rawFilters);
  const filters: CaseQueryInput = parsed.success
    ? parsed.data
    : { sortBy: "newest", page: 1, limit: 12 };

  const [paginatedCases, featuredCase] = await Promise.all([
    CaseService.getPublishedCases(filters),
    CaseService.getFeaturedCase(),
  ]);

  const isFiltered = Boolean(filters.search || filters.difficulty || filters.campaignSlug);

  return (
    <div className="space-y-6">
      {/* Page Title & Status Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#182236]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-[10px] text-cyan-400 uppercase tracking-widest px-2 py-0.5 rounded bg-cyan-950/50 border border-cyan-800/60">
              Intelligence Archive
            </span>
            <span className="text-slate-500 text-xs font-mono">&bull;</span>
            <span className="text-slate-400 text-xs font-mono">Tier 1 Dispatch</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight font-sans">
            Case Operations Directory
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Access active crime scenes, corporate conspiracies, and classified international
            dossiers. All investigations operate under strict operational security protocols.
          </p>
        </div>

        {/* Global Archive Metric */}
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-[#0c1322] border border-[#1b263e] shrink-0">
          <div className="p-2 rounded-lg bg-blue-950/50 text-cyan-400 border border-blue-800/40">
            <FolderSearch className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
              Published Files
            </div>
            <div className="text-sm font-semibold font-mono text-cyan-300">
              {paginatedCases.total} {paginatedCases.total === 1 ? "Dossier" : "Dossiers"}
            </div>
          </div>
        </div>
      </div>

      {/* Featured Priority Case (Only shown when not actively filtering) */}
      {!isFiltered && featuredCase && (
        <section aria-label="Featured Priority Case">
          <FeaturedCaseBanner caseData={featuredCase} />
        </section>
      )}

      {/* Search & Filter Controls */}
      <section aria-label="Case Search and Filtering">
        <CaseSearchFilters
          initialSearch={filters.search}
          initialDifficulty={filters.difficulty}
          initialSortBy={filters.sortBy}
        />
      </section>

      {/* Case Grid */}
      <section aria-label="Classified Case Catalog">
        {paginatedCases.items.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {paginatedCases.items.map((caseItem) => (
              <CaseCard key={caseItem.id} caseData={caseItem} />
            ))}
          </div>
        ) : (
          <div className="rounded-xl bg-[#0d1424] border border-[#1e2a42] p-12 text-center max-w-lg mx-auto">
            <div className="w-12 h-12 rounded-full bg-cyan-950/40 border border-cyan-800/50 flex items-center justify-center mx-auto mb-4 text-cyan-400">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold text-white mb-2 font-sans">
              No Classified Dossiers Found
            </h3>
            <p className="text-xs text-slate-400 mb-6 leading-relaxed">
              No published case files match your active query criteria. Try adjusting the threat
              tier or clearing search keywords.
            </p>
          </div>
        )}

        {/* Pagination */}
        <CasePagination
          currentPage={paginatedCases.page}
          totalPages={paginatedCases.totalPages}
          totalItems={paginatedCases.total}
        />
      </section>
    </div>
  );
}
