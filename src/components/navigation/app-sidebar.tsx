"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Shield,
  LayoutDashboard,
  FolderSearch,
  FolderGit2,
  FileKey,
  Network,
  Users2,
  Award,
  UserCog,
  LogOut,
  ExternalLink,
} from "lucide-react";
import type { PlayerDossier } from "@/modules/players/types/player.types";

interface AppSidebarProps {
  dossier: PlayerDossier;
}

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
  badge?: string;
  isComingSoon?: boolean;
}

const NAV_ITEMS: readonly NavItem[] = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    name: "Cases",
    href: "/cases",
    icon: FolderSearch,
  },
  {
    name: "Campaigns",
    href: "/campaigns",
    icon: FolderGit2,
  },
  {
    name: "Evidence",
    href: "/evidence",
    icon: FileKey,
    badge: "Phase 08",
    isComingSoon: true,
  },
  {
    name: "Investigation Board",
    href: "/board",
    icon: Network,
    badge: "Phase 11",
    isComingSoon: true,
  },
  {
    name: "Squads & Units",
    href: "/teams",
    icon: Users2,
    badge: "Phase 09",
    isComingSoon: true,
  },
  {
    name: "Commendations",
    href: "/achievements",
    icon: Award,
    badge: "Phase 12",
    isComingSoon: true,
  },
  {
    name: "Investigator Dossier",
    href: "/profile",
    icon: UserCog,
  },
] as const;

export function AppSidebar({ dossier }: AppSidebarProps) {
  const pathname = usePathname();
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
    <aside className="w-64 bg-[#0a0f1a] border-r border-[#1a233a] flex flex-col shrink-0 h-screen sticky top-0 select-none">
      {/* Brand Header */}
      <div className="p-5 border-b border-[#162035] flex items-center gap-3">
        <div className="p-2 rounded bg-[#101726] border border-[#22304d] text-cyan-400">
          <Shield className="w-5 h-5" strokeWidth={1.75} aria-hidden="true" />
        </div>
        <div>
          <span className="text-sm font-semibold tracking-tight text-slate-100 font-sans block">
            MYSTERY NETWORK
          </span>
          <span className="text-[10px] font-mono text-cyan-400/80 uppercase tracking-widest block">
            Intelligence Console
          </span>
        </div>
      </div>

      {/* Navigation Menu */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        <div className="px-3 pb-2 text-[10px] font-mono uppercase tracking-widest text-slate-500">
          Operational Navigation
        </div>

        {NAV_ITEMS.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(`${item.href}/`));
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center justify-between px-3 py-2 rounded-md text-xs font-mono transition-colors group ${
                isActive
                  ? "bg-blue-600/15 border border-blue-500/30 text-blue-200"
                  : "text-slate-400 hover:text-slate-200 hover:bg-[#121929] border border-transparent"
              }`}
            >
              <div className="flex items-center gap-2.5 truncate">
                <Icon
                  className={`w-4 h-4 shrink-0 transition-colors ${
                    isActive ? "text-cyan-400" : "text-slate-500 group-hover:text-slate-300"
                  }`}
                  strokeWidth={1.75}
                />
                <span className="truncate">{item.name}</span>
              </div>

              {item.badge && (
                <span
                  className={`text-[9px] px-1.5 py-0.5 rounded font-mono uppercase tracking-wider shrink-0 ${
                    isActive
                      ? "bg-blue-900/40 text-blue-300 border border-blue-700/50"
                      : "bg-[#141d30] text-slate-400 border border-[#1f2b45]"
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      {/* Operative Mini-Profile & Logout */}
      <div className="p-3 border-t border-[#162035] bg-[#0c121e] space-y-3">
        <div className="flex items-center gap-3 px-2 py-1">
          <div className="w-8 h-8 rounded bg-[#162238] border border-[#233555] flex items-center justify-center font-mono text-xs font-semibold text-cyan-300 shrink-0">
            {dossier.codename.slice(0, 2).toUpperCase()}
          </div>
          <div className="truncate flex-1">
            <span className="text-xs font-semibold font-mono text-slate-200 block truncate">
              {dossier.codename}
            </span>
            <span className="text-[10px] font-mono text-slate-400 block truncate">
              {dossier.rank.title} &bull; Lvl {dossier.level}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 pt-1">
          <Link
            href="/profile"
            className="flex-1 flex items-center justify-center gap-1.5 text-[11px] font-mono py-1.5 px-2 rounded bg-[#131b2e] hover:bg-[#1a253d] border border-[#22304d] text-slate-300 transition-colors"
          >
            <UserCog className="w-3.5 h-3.5 text-cyan-400" />
            Dossier
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            title="Terminate Operative Session"
            className="flex items-center justify-center p-1.5 rounded bg-[#131b2e] hover:bg-red-950/40 border border-[#22304d] hover:border-red-900/50 text-slate-400 hover:text-red-300 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
