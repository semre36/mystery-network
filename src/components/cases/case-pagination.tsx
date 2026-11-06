"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface CasePaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
}

export function CasePagination({ currentPage, totalPages, totalItems }: CasePaginationProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (totalPages <= 1) {
    return null;
  }

  const createPageUrl = (pageNumber: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", pageNumber.toString());
    return `${pathname}?${params.toString()}`;
  };

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-6 border-t border-[#1a243b] mt-8 text-xs font-mono">
      <div className="text-slate-400">
        Displaying page <span className="text-cyan-400 font-semibold">{currentPage}</span> of{" "}
        <span className="text-slate-200">{totalPages}</span> ({totalItems} total classified cases)
      </div>

      <div className="flex items-center gap-1.5">
        {/* Previous Button */}
        {currentPage > 1 ? (
          <Link
            href={createPageUrl(currentPage - 1)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-[#0e1626] border border-[#1f2b45] text-slate-300 hover:text-white hover:border-cyan-500/50 transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>Prev</span>
          </Link>
        ) : (
          <span className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-[#0a0f1b] border border-[#161f33] text-slate-600 cursor-not-allowed">
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>Prev</span>
          </span>
        )}

        {/* Page Pills */}
        <div className="hidden sm:flex items-center gap-1">
          {pages.map((p) => {
            const isActive = p === currentPage;
            return (
              <Link
                key={p}
                href={createPageUrl(p)}
                className={`w-7 h-7 flex items-center justify-center rounded-md transition-colors ${
                  isActive
                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-semibold"
                    : "bg-[#0e1626] border border-[#1f2b45] text-slate-400 hover:text-white hover:border-slate-500"
                }`}
              >
                {p}
              </Link>
            );
          })}
        </div>

        {/* Next Button */}
        {currentPage < totalPages ? (
          <Link
            href={createPageUrl(currentPage + 1)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-[#0e1626] border border-[#1f2b45] text-slate-300 hover:text-white hover:border-cyan-500/50 transition-colors"
          >
            <span>Next</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        ) : (
          <span className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-[#0a0f1b] border border-[#161f33] text-slate-600 cursor-not-allowed">
            <span>Next</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </span>
        )}
      </div>
    </div>
  );
}
