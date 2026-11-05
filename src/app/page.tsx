import { Shield } from "lucide-react";
import { APP_NAME, APP_TAGLINE, APP_MOTTO, APP_STATUS_MESSAGE } from "@/lib/constants/app";
import { TelegramAuthWidget } from "@/components/auth/telegram-auth-widget";

export default function HomePage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-[#090c12] text-slate-100">
      <div className="w-full max-w-xl mx-auto">
        <div className="bg-[#0f1523] border border-[#1a233a] rounded-lg p-8 sm:p-12 shadow-2xl">
          {/* Header Mark */}
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2 rounded bg-[#131b2e] border border-[#232f48] text-blue-400">
              <Shield className="w-5 h-5" strokeWidth={1.75} aria-hidden="true" />
            </div>
            <div>
              <span className="text-xs font-mono uppercase tracking-widest text-blue-400/90 block">
                {APP_TAGLINE}
              </span>
              <span className="text-[11px] font-mono text-slate-500">SYSTEM ID: MN-01</span>
            </div>
          </div>

          {/* Primary Identity */}
          <div className="space-y-4 mb-8">
            <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-slate-100 font-sans">
              {APP_NAME}
            </h1>
            <p className="text-lg text-slate-300 font-medium italic border-l-2 border-blue-500/70 pl-4 py-1">
              &ldquo;{APP_MOTTO}&rdquo;
            </p>
          </div>

          {/* Authentication Status / Mini App Integration */}
          <div className="mb-8">
            <TelegramAuthWidget />
          </div>

          {/* System Status Statement */}
          <div className="border-t border-[#1a233a] pt-6 space-y-3">
            <div className="flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-blue-500" />
              <span className="text-xs font-mono uppercase tracking-wider text-slate-400">
                Phase 04 — Telegram Mini App Authentication Active
              </span>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed">{APP_STATUS_MESSAGE}</p>
          </div>
        </div>

        {/* Minimal Footer Notice */}
        <p className="text-center text-xs font-mono text-slate-600 mt-8 tracking-wider">
          SECURE PROTOCOL &bull; ENCRYPTED ENVIRONMENT
        </p>
      </div>
    </main>
  );
}
