import Link from "next/link";
import { FileQuestion, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#090c12] text-slate-100">
      <div className="w-full max-w-md bg-[#0f1523] border border-[#1a233a] rounded-lg p-8 shadow-xl text-center space-y-6">
        <div className="inline-flex p-3 rounded-full bg-blue-950/40 border border-blue-900/50 text-blue-400">
          <FileQuestion className="w-6 h-6" />
        </div>
        <div>
          <span className="text-xs font-mono uppercase tracking-widest text-slate-500">
            Error 404
          </span>
          <h2 className="text-xl font-semibold text-slate-100 mt-1">Resource Not Found</h2>
          <p className="text-sm text-slate-400 mt-2">
            The requested evidence, record, or route does not exist in the network directory.
          </p>
        </div>
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded bg-[#131b2e] hover:bg-[#1a233a] border border-[#232f48] text-slate-200 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Return to Network
          </Link>
        </div>
      </div>
    </div>
  );
}
