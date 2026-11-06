"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ShieldAlert,
  Users,
  Compass,
  Briefcase,
  Layers,
  UserCheck,
  Search,
  KeyRound,
  Eye,
  Award,
  Coins,
  BarChart3,
  ScrollText,
  Sliders,
  LogOut,
  ChevronRight,
  Menu,
  X,
  ExternalLink,
  ShieldCheck,
  Radio,
} from "lucide-react";

interface AdminLayoutProps {
  children: React.ReactNode;
}

const NAV_ITEMS = [
  { label: "Overview", href: "/admin", icon: Radio },
  { label: "Operatives", href: "/admin/users", icon: Users },
  { label: "Campaigns", href: "/admin/campaigns", icon: Compass },
  { label: "Mystery Cases", href: "/admin/cases", icon: Briefcase },
  { label: "Investigations", href: "/admin/investigations", icon: Eye },
  { label: "Accolades", href: "/admin/achievements", icon: Award },
  { label: "XP Ledger", href: "/admin/rewards", icon: Coins },
  { label: "Analytics", href: "/admin/analytics", icon: BarChart3 },
  { label: "Audit Logs", href: "/admin/audit-logs", icon: ScrollText },
  { label: "Roles & RBAC", href: "/admin/roles", icon: ShieldCheck },
  { label: "Settings", href: "/admin/settings", icon: Sliders },
];

export function AdminLayout({ children }: AdminLayoutProps) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row antialiased">
      {/* Mobile Top Header */}
      <div className="md:hidden flex items-center justify-between p-4 bg-slate-900/90 border-b border-slate-800 backdrop-blur sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-red-500" />
          <span className="font-mono font-bold tracking-wider text-sm text-red-400">
            NETWORK CONTROL
          </span>
        </div>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 rounded bg-slate-800 text-slate-300 hover:text-white"
        >
          {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Sidebar Navigation */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 border-r border-slate-800 transform transition-transform duration-200 ease-in-out md:translate-x-0 md:static md:inset-auto ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } flex flex-col`}
      >
        {/* Brand Header */}
        <div className="p-5 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-red-950/60 border border-red-500/40 flex items-center justify-center text-red-400 shadow-sm shadow-red-950">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-mono font-bold tracking-wider text-red-400 uppercase">
                HQ Command
              </div>
              <div className="text-sm font-semibold tracking-tight text-slate-200">
                Mystery Network
              </div>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="md:hidden text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-xs font-medium transition-colors ${
                  isActive
                    ? "bg-red-950/40 text-red-300 border border-red-800/50 shadow-sm"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-red-400" : "text-slate-400"}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer Actions */}
        <div className="p-3 border-t border-slate-800/80 space-y-2">
          <Link
            href="/dashboard"
            className="flex items-center justify-between px-3 py-2 rounded-md bg-slate-800/40 hover:bg-slate-800 border border-slate-700/50 text-xs text-slate-300 transition-colors"
          >
            <span className="flex items-center gap-2">
              <ExternalLink className="w-3.5 h-3.5 text-blue-400" />
              <span>Player Workspace</span>
            </span>
            <ChevronRight className="w-3 h-3 text-slate-500" />
          </Link>
          <div className="px-3 py-2 text-[10px] font-mono text-slate-500 flex items-center justify-between">
            <span>VERSION 1.0 (PHASE 13)</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Desktop Top Bar */}
        <header className="hidden md:flex items-center justify-between px-8 py-3.5 bg-slate-900/40 border-b border-slate-800/80 backdrop-blur">
          <div className="flex items-center gap-3 text-xs font-mono text-slate-400">
            <span className="text-slate-500">OPERATIONAL ACCESS:</span>
            <span className="px-2 py-0.5 rounded bg-red-950/60 text-red-400 border border-red-800/40 font-bold uppercase tracking-wider text-[11px]">
              SUPERVISOR PRIVILEGE
            </span>
          </div>

          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="text-xs text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1.5"
            >
              <span>Back to Detective Console</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>
        </header>

        {/* Page Content */}
        <div className="p-4 md:p-8 flex-1 max-w-7xl w-full mx-auto">{children}</div>
      </main>
    </div>
  );
}
