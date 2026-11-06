"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShieldCheck, LogOut, Radio } from "lucide-react";
import type { PlayerDossier } from "@/modules/players/types/player.types";

interface AppHeaderProps {
  dossier: PlayerDossier;
}

export function AppHeader({ dossier }: AppHeaderProps) {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.push("/");
      router.refresh();
    }
  };

  return (
    <header className="h-14 border-b border-[#1a233a] bg-[#0c121e]/80 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 select-none">
      {/* Network Clearance Status */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-2.5 py-1 rounded bg-[#101726] border border-[#1b2740]">
          <Radio className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
          <span className="text-[11px] font-mono text-cyan-300 uppercase tracking-wider font-semibold">
            CLEARANCE ACTIVE
          </span>
        </div>
        <span className="hidden md:inline text-[11px] font-mono text-slate-500">
          SECURE PROTOCOL &bull; ENCRYPTED SESSION
        </span>
      </div>

      {/* Operative Pill & Logout Shortcut */}
      <div className="flex items-center gap-3">
        <Link
          href="/profile"
          className="flex items-center gap-2 px-2.5 py-1 rounded bg-[#131b2e] hover:bg-[#1a253d] border border-[#22304d] text-slate-200 transition-colors"
        >
          <ShieldCheck className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          <span className="text-xs font-mono font-medium truncate max-w-[130px] sm:max-w-[200px]">
            {dossier.codename}
          </span>
          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-cyan-950 border border-cyan-800 text-cyan-300">
            {dossier.rank.badge}
          </span>
        </Link>

        <button
          type="button"
          onClick={handleLogout}
          className="text-slate-400 hover:text-red-400 p-1.5 rounded hover:bg-[#151c2e] transition-colors"
          title="Sign Out"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
