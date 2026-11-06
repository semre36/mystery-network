"use client";

import React, { useState } from "react";
import { Link2, X } from "lucide-react";
import {
  SafeBoardNodeDto,
  BoardRelationshipType,
} from "@/modules/investigation-board/types/board.types";

interface ConnectionDialogProps {
  sourceNode: SafeBoardNodeDto;
  targetNode: SafeBoardNodeDto;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: {
    relationshipType: BoardRelationshipType;
    label?: string;
    description?: string;
  }) => void;
}

const RELATIONSHIPS: Array<{
  type: BoardRelationshipType;
  label: string;
  color: string;
  description: string;
}> = [
  {
    type: BoardRelationshipType.RELATED_TO,
    label: "Related To",
    color: "text-red-400 border-red-500/50 bg-red-950/30",
    description: "Standard investigative connection",
  },
  {
    type: BoardRelationshipType.SUPPORTS,
    label: "Supports",
    color: "text-emerald-400 border-emerald-500/50 bg-emerald-950/30",
    description: "Validates or corroborates the pin",
  },
  {
    type: BoardRelationshipType.CONTRADICTS,
    label: "Contradicts",
    color: "text-rose-400 border-rose-500/50 bg-rose-950/30",
    description: "Disproves or undermines an alibi/fact",
  },
  {
    type: BoardRelationshipType.SUSPECTED_OF,
    label: "Suspected Of",
    color: "text-amber-400 border-amber-500/50 bg-amber-950/30",
    description: "Connects a suspect directly to a clue/event",
  },
  {
    type: BoardRelationshipType.CONNECTED_TO,
    label: "Connected To",
    color: "text-cyan-400 border-cyan-500/50 bg-cyan-950/30",
    description: "Direct technical or forensic link",
  },
  {
    type: BoardRelationshipType.PRESENT_AT,
    label: "Present At",
    color: "text-blue-400 border-blue-500/50 bg-blue-950/30",
    description: "Geo-location or timeline placement",
  },
  {
    type: BoardRelationshipType.COMMUNICATED_WITH,
    label: "Communicated With",
    color: "text-purple-400 border-purple-500/50 bg-purple-950/30",
    description: "Phone, transmission, or meeting link",
  },
];

export function ConnectionDialog({
  sourceNode,
  targetNode,
  isOpen,
  onClose,
  onConfirm,
}: ConnectionDialogProps) {
  const [relationshipType, setRelationshipType] = useState<BoardRelationshipType>(
    BoardRelationshipType.RELATED_TO
  );
  const [label, setLabel] = useState("");
  const [description, setDescription] = useState("");

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm({
      relationshipType,
      label: label.trim() || undefined,
      description: description.trim() || undefined,
    });
    setLabel("");
    setDescription("");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-lg rounded-2xl bg-[#0b1220] border border-[#1e2a44] shadow-2xl p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#18233a] pb-3">
          <div className="flex items-center gap-2">
            <Link2 className="w-4 h-4 text-red-400" />
            <h3 className="text-sm font-semibold text-slate-100 font-sans">
              Connect Pins With Detective String
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Nodes summary banner */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-[#080d17] border border-[#141d30] text-xs font-mono">
          <div className="truncate max-w-[42%] text-slate-300 font-semibold">
            {sourceNode.title}
          </div>
          <span className="text-red-400 font-bold px-2">──►</span>
          <div className="truncate max-w-[42%] text-slate-300 font-semibold text-right">
            {targetNode.title}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block">
              Relationship Type
            </label>
            <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
              {RELATIONSHIPS.map((rel) => (
                <button
                  key={rel.type}
                  type="button"
                  onClick={() => setRelationshipType(rel.type)}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    relationshipType === rel.type
                      ? `${rel.color} ring-2 ring-cyan-500/40`
                      : "border-[#19243b] bg-[#0c1424] text-slate-400 hover:border-[#263757]"
                  }`}
                >
                  <div className="text-xs font-semibold font-sans">{rel.label}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">{rel.description}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block">
              Short Connection Label (Optional)
            </label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Alibi witness, Call log 23:42..."
              maxLength={60}
              className="w-full px-3 py-2 rounded-xl bg-[#080d17] border border-[#19243b] text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 font-sans"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block">
              Investigative Reasoning / Explanation
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Why does this connection matter to the case?"
              rows={2}
              maxLength={500}
              className="w-full px-3 py-2 rounded-xl bg-[#080d17] border border-[#19243b] text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 font-sans resize-none"
            />
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#18233a]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-mono text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-mono font-semibold transition-colors shadow-md shadow-red-950/40"
            >
              Pin Connection String
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

