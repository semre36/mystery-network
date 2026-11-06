"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Radio, Loader2, ArrowRight, AlertCircle } from "lucide-react";

interface StartInvestigationButtonProps {
  caseCode: string;
  className?: string;
}

export function StartInvestigationButton({
  caseCode,
  className = "",
}: StartInvestigationButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStart = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/investigations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caseIdentifier: caseCode }),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || "Failed to dispatch investigation session");
      }

      router.push(`/investigations/${json.data.investigationId}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Operational dispatch failed");
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        type="button"
        onClick={handleStart}
        disabled={loading}
        className={`inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-mono text-sm font-semibold shadow-lg shadow-cyan-950/60 hover:shadow-cyan-500/25 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed group ${className}`}
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin text-white" />
            <span>DISPATCHING SESSION...</span>
          </>
        ) : (
          <>
            <Radio className="w-4 h-4 text-cyan-200 group-hover:scale-110 transition-transform" />
            <span>START INVESTIGATION</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </>
        )}
      </button>

      {error && (
        <div className="flex items-center gap-1.5 text-xs text-rose-400 font-mono mt-1">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
