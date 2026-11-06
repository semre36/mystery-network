import React from "react";
import { AppSidebar } from "@/components/navigation/app-sidebar";
import { AppHeader } from "@/components/navigation/app-header";
import { MobileNavigation } from "@/components/navigation/mobile-nav";
import type { PlayerDossier } from "@/modules/players/types/player.types";

interface AppShellProps {
  dossier: PlayerDossier;
  children: React.ReactNode;
}

export function AppShell({ dossier, children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-[#090c12] text-slate-100 flex flex-col lg:flex-row antialiased selection:bg-blue-900/40 selection:text-blue-200">
      {/* Desktop Persistent Sidebar */}
      <div className="hidden lg:block shrink-0">
        <AppSidebar dossier={dossier} />
      </div>

      {/* Main Execution Column */}
      <div className="flex-1 flex flex-col min-w-0">
        <AppHeader dossier={dossier} />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto pb-24 lg:pb-12">
          {children}
        </main>

        {/* Mobile Persistent Bottom Nav */}
        <MobileNavigation />
      </div>
    </div>
  );
}
