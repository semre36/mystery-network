import React from "react";
import { History, ShieldCheck, UserCheck, Terminal } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import type { PlayerActivityItem } from "@/modules/players/types/player.types";

interface RecentActivityPanelProps {
  activity: PlayerActivityItem[];
}

export function RecentActivityPanel({ activity }: RecentActivityPanelProps) {
  const hasActivity = activity.length > 0;

  const getActivityIcon = (type: PlayerActivityItem["type"]) => {
    switch (type) {
      case "ACCOUNT_CREATED":
        return <UserCheck className="w-3.5 h-3.5 text-cyan-400" />;
      case "SESSION_AUTHENTICATED":
        return <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />;
      default:
        return <Terminal className="w-3.5 h-3.5 text-amber-400" />;
    }
  };

  return (
    <div className="bg-[#0f1523] border border-[#1a233a] rounded-lg p-5 sm:p-6 shadow-xl space-y-4">
      <div className="flex items-center justify-between border-b border-[#18233c] pb-3">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-cyan-400" />
          <h3 className="text-sm font-semibold tracking-tight text-slate-100 font-sans">
            Authentication & Operative Log
          </h3>
        </div>
        <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">
          System Log Audit
        </span>
      </div>

      {hasActivity ? (
        <div className="space-y-3">
          {activity.map((item) => (
            <div
              key={item.id}
              className="p-3 rounded bg-[#0b101c] border border-[#18233a] flex items-start justify-between gap-3"
            >
              <div className="flex items-start gap-2.5">
                <div className="p-1.5 rounded bg-[#131b2e] border border-[#22304d] shrink-0 mt-0.5">
                  {getActivityIcon(item.type)}
                </div>
                <div>
                  <span className="text-xs font-semibold text-slate-200 block font-sans">
                    {item.title}
                  </span>
                  {item.details && (
                    <p className="text-[11px] text-slate-400 font-mono mt-0.5 leading-relaxed">
                      {item.details}
                    </p>
                  )}
                </div>
              </div>
              <span className="text-[10px] font-mono text-slate-400 shrink-0 text-right">
                {new Date(item.timestamp).toLocaleString("en-US", {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={History}
          badge="AUDIT STANDBY"
          title="No operational logs recorded."
          description="Investigative events, clue evaluations, and squad transmissions will populate this timeline upon case dispatch."
        />
      )}
    </div>
  );
}
