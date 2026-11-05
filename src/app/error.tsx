"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { logger } from "@/lib/logger";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: ErrorProps) {
  useEffect(() => {
    logger.error("Unhandled client error captured by root boundary", {
      message: error.message,
      digest: error.digest,
    });
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#090c12] text-slate-100">
      <div className="w-full max-w-md bg-[#0f1523] border border-[#1a233a] rounded-lg p-8 shadow-xl text-center space-y-6">
        <div className="inline-flex p-3 rounded-full bg-red-950/40 border border-red-900/50 text-red-400">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-slate-100">System Interruption</h2>
          <p className="text-sm text-slate-400 mt-2">
            An unexpected error occurred while processing this operation.
          </p>
        </div>
        {error.digest && (
          <p className="text-xs font-mono text-slate-500">Incident Digest: {error.digest}</p>
        )}
        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded bg-[#131b2e] hover:bg-[#1a233a] border border-[#232f48] text-slate-200 transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
          Attempt Recovery
        </button>
      </div>
    </div>
  );
}
