"use client";

import React from "react";
import {
  FileText,
  UserCheck,
  StickyNote,
  MapPin,
  Calendar,
  Lightbulb,
  X,
  Link2,
  Trash2,
  Lock,
} from "lucide-react";
import { SafeBoardNodeDto, BoardNodeType } from "@/modules/investigation-board/types/board.types";

interface BoardCardProps {
  node: SafeBoardNodeDto;
  isSelected: boolean;
  isConnectSource: boolean;
  onSelect: (node: SafeBoardNodeDto) => void;
  onStartConnect: (node: SafeBoardNodeDto) => void;
  onDelete: (nodeId: string) => void;
  onMouseDown: (e: React.MouseEvent, node: SafeBoardNodeDto) => void;
}

const TYPE_CONFIG: Record<
  BoardNodeType,
  { label: string; icon: any; border: string; bg: string; text: string; pinColor: string }
> = {
  EVIDENCE: {
    label: "Evidence",
    icon: FileText,
    border: "border-cyan-500/50 hover:border-cyan-400",
    bg: "bg-[#0c1424]",
    text: "text-cyan-300",
    pinColor: "bg-cyan-500 shadow-cyan-500/50",
  },
  CHARACTER: {
    label: "Person of Interest",
    icon: UserCheck,
    border: "border-amber-500/50 hover:border-amber-400",
    bg: "bg-[#14120c]",
    text: "text-amber-300",
    pinColor: "bg-amber-500 shadow-amber-500/50",
  },
  NOTE: {
    label: "Investigator Note",
    icon: StickyNote,
    border: "border-yellow-500/50 hover:border-yellow-400",
    bg: "bg-[#141408]",
    text: "text-yellow-300",
    pinColor: "bg-yellow-400 shadow-yellow-500/50",
  },
  LOCATION: {
    label: "Location",
    icon: MapPin,
    border: "border-emerald-500/50 hover:border-emerald-400",
    bg: "bg-[#091410]",
    text: "text-emerald-300",
    pinColor: "bg-emerald-500 shadow-emerald-500/50",
  },
  EVENT: {
    label: "Event Pin",
    icon: Calendar,
    border: "border-blue-500/50 hover:border-blue-400",
    bg: "bg-[#0a1220]",
    text: "text-blue-300",
    pinColor: "bg-blue-500 shadow-blue-500/50",
  },
  THEORY: {
    label: "Theory Pin",
    icon: Lightbulb,
    border: "border-purple-500/50 hover:border-purple-400",
    bg: "bg-[#120a1f]",
    text: "text-purple-300",
    pinColor: "bg-purple-500 shadow-purple-500/50",
  },
};

export function BoardCard({
  node,
  isSelected,
  isConnectSource,
  onSelect,
  onStartConnect,
  onDelete,
  onMouseDown,
}: BoardCardProps) {
  const config = TYPE_CONFIG[node.nodeType] ?? TYPE_CONFIG.NOTE;
  const Icon = config.icon;

  return (
    <div
      style={{
        transform: `translate3d(${node.positionX}px, ${node.positionY}px, 0)`,
        width: `${node.width || 240}px`,
      }}
      className={`absolute select-none cursor-move rounded-xl border transition-shadow shadow-lg ${
        config.bg
      } ${
        isConnectSource
          ? "border-red-500 ring-2 ring-red-500 shadow-red-500/30 animate-pulse"
          : isSelected
            ? "border-cyan-400 ring-2 ring-cyan-400/40 shadow-cyan-950/50"
            : config.border
      }`}
      onMouseDown={(e) => onMouseDown(e, node)}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(node);
      }}
    >
      {/* Decorative Push-Pin on top center */}
      <div className="absolute -top-2 left-1/2 -translate-x-1/2 flex items-center justify-center">
        <div
          className={`w-3.5 h-3.5 rounded-full border border-black/60 shadow-sm ${config.pinColor}`}
        />
      </div>

      {/* Card Header */}
      <div className="p-3 border-b border-white/5 flex items-center justify-between gap-1.5">
        <div className="flex items-center gap-1.5 min-w-0">
          <Icon className={`w-3.5 h-3.5 shrink-0 ${config.text}`} />
          <span
            className={`text-[10px] font-mono uppercase tracking-wider truncate ${config.text}`}
          >
            {node.entityPreview?.code || config.label}
          </span>
        </div>

        <div className="flex items-center gap-1">
          {/* Connect button */}
          <button
            type="button"
            title="Connect string to another pin"
            onClick={(e) => {
              e.stopPropagation();
              onStartConnect(node);
            }}
            className={`p-1 rounded hover:bg-white/10 transition-colors ${
              isConnectSource ? "text-red-400 bg-red-950/60" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Link2 className="w-3.5 h-3.5" />
          </button>

          {/* Delete button */}
          <button
            type="button"
            title="Remove pin from board"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(node.id);
            }}
            className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Card Body */}
      <div className="p-3 space-y-2">
        <h4 className="text-xs font-semibold text-slate-100 font-sans leading-snug line-clamp-2">
          {node.title}
        </h4>

        {node.description && (
          <p className="text-[11px] text-slate-400 line-clamp-3 leading-relaxed">
            {node.description}
          </p>
        )}

        {/* Entity specific badge or role */}
        {node.entityPreview?.role && (
          <div className="text-[10px] font-mono text-amber-400 bg-amber-950/40 px-2 py-0.5 rounded border border-amber-800/40 inline-block">
            {node.entityPreview.role}
          </div>
        )}

        {node.entityPreview?.clueType && (
          <div className="text-[10px] font-mono text-cyan-400 bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-800/40 inline-block">
            TYPE: {node.entityPreview.clueType}
          </div>
        )}
      </div>

      {/* Card Footer: author & timestamp */}
      <div className="px-3 py-1.5 bg-black/20 border-t border-white/5 flex items-center justify-between text-[9px] font-mono text-slate-500">
        <span className="truncate">By {node.createdByCodename}</span>
        <span>PIN #{node.id.slice(0, 4)}</span>
      </div>
    </div>
  );
}
