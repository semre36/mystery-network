"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, FolderSearch, FileKey, UserCog } from "lucide-react";

const MOBILE_NAV_ITEMS = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Cases", href: "/cases", icon: FolderSearch },
  { name: "Evidence", href: "/evidence", icon: FileKey },
  { name: "Profile", href: "/profile", icon: UserCog },
] as const;

export function MobileNavigation() {
  const pathname = usePathname();

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0a0f1a]/95 backdrop-blur-md border-t border-[#1a233a] px-3 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
      <div className="grid grid-cols-4 gap-1">
        {MOBILE_NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-md text-[10px] font-mono transition-colors ${
                isActive
                  ? "text-cyan-400 bg-cyan-950/20 font-semibold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Icon
                className={`w-4 h-4 mb-0.5 ${isActive ? "text-cyan-400" : "text-slate-500"}`}
                strokeWidth={isActive ? 2 : 1.75}
              />
              <span className="truncate">{item.name}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
