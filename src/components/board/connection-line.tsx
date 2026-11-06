"use client";

import React from "react";
import {
  SafeBoardConnectionDto,
  SafeBoardNodeDto,
  BoardRelationshipType,
} from "@/modules/investigation-board/types/board.types";

interface ConnectionLineProps {
  connection: SafeBoardConnectionDto;
  sourceNode?: SafeBoardNodeDto;
  targetNode?: SafeBoardNodeDto;
  onDeleteConnection: (connectionId: string) => void;
}

const RELATION_COLORS: Record<
  BoardRelationshipType,
  { stroke: string; badgeBg: string; badgeBorder: string; badgeText: string }
> = {
  RELATED_TO: {
    stroke: "#dc2626", // Classic crimson red detective string
    badgeBg: "bg-red-950/80",
    badgeBorder: "border-red-600/60",
    badgeText: "text-red-300",
  },
  SUPPORTS: {
    stroke: "#10b981", // Emerald green
    badgeBg: "bg-emerald-950/80",
    badgeBorder: "border-emerald-600/60",
    badgeText: "text-emerald-300",
  },
  CONTRADICTS: {
    stroke: "#f43f5e", // Rose pink
    badgeBg: "bg-rose-950/80",
    badgeBorder: "border-rose-600/60",
    badgeText: "text-rose-300",
  },
  CONNECTED_TO: {
    stroke: "#06b6d4", // Cyan
    badgeBg: "bg-cyan-950/80",
    badgeBorder: "border-cyan-600/60",
    badgeText: "text-cyan-300",
  },
  SUSPECTED_OF: {
    stroke: "#f59e0b", // Amber
    badgeBg: "bg-amber-950/80",
    badgeBorder: "border-amber-600/60",
    badgeText: "text-amber-300",
  },
  PRESENT_AT: {
    stroke: "#3b82f6", // Blue
    badgeBg: "bg-blue-950/80",
    badgeBorder: "border-blue-600/60",
    badgeText: "text-blue-300",
  },
  COMMUNICATED_WITH: {
    stroke: "#8b5cf6", // Purple
    badgeBg: "bg-purple-950/80",
    badgeBorder: "border-purple-600/60",
    badgeText: "text-purple-300",
  },
  CUSTOM: {
    stroke: "#94a3b8", // Slate
    badgeBg: "bg-slate-900/80",
    badgeBorder: "border-slate-600/60",
    badgeText: "text-slate-300",
  },
};

export function ConnectionLine({
  connection,
  sourceNode,
  targetNode,
  onDeleteConnection,
}: ConnectionLineProps) {
  if (!sourceNode || !targetNode) return null;

  // Compute anchor positions (center top of each card push-pin)
  const sourceWidth = sourceNode.width || 240;
  const targetWidth = targetNode.width || 240;

  const startX = sourceNode.positionX + sourceWidth / 2;
  const startY = sourceNode.positionY;

  const endX = targetNode.positionX + targetWidth / 2;
  const endY = targetNode.positionY;

  // Calculate midpoint for the badge
  const midX = (startX + endX) / 2;
  const midY = (startY + endY) / 2;

  // Add a slight natural droop / curve to mimic physical string hanging on a board
  const distance = Math.hypot(endX - startX, endY - startY);
  const droop = Math.min(distance * 0.15, 60);
  const controlX = midX;
  const controlY = midY + droop;

  const pathData = `M ${startX} ${startY} Q ${controlX} ${controlY} ${endX} ${endY}`;
  const style = RELATION_COLORS[connection.relationshipType] ?? RELATION_COLORS.RELATED_TO;

  return (
    <g className="group">
      {/* Visual string shadow */}
      <path
        d={pathData}
        fill="none"
        stroke="rgba(0,0,0,0.5)"
        strokeWidth={3}
        strokeLinecap="round"
        transform="translate(2, 4)"
      />

      {/* Main string line */}
      <path
        d={pathData}
        fill="none"
        stroke={style.stroke}
        strokeWidth={2}
        strokeLinecap="round"
        strokeDasharray={
          connection.relationshipType === BoardRelationshipType.CONTRADICTS ? "6 4" : undefined
        }
        className="transition-all hover:stroke-width-3 cursor-pointer"
      />

      {/* Center Relationship Badge */}
      <foreignObject
        x={controlX - 70}
        y={controlY - 14}
        width={140}
        height={28}
        className="overflow-visible"
      >
        <div className="flex items-center justify-center">
          <div
            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[9px] font-mono tracking-wider shadow-md backdrop-blur-sm ${style.badgeBg} ${style.badgeBorder} ${style.badgeText}`}
          >
            <span className="truncate max-w-[90px]">
              {connection.label || connection.relationshipType.replace(/_/g, " ")}
            </span>
            <button
              type="button"
              title="Disconnect string"
              onClick={(e) => {
                e.stopPropagation();
                onDeleteConnection(connection.id);
              }}
              className="text-white/60 hover:text-rose-300 font-bold ml-0.5"
            >
              ×
            </button>
          </div>
        </div>
      </foreignObject>
    </g>
  );
}
