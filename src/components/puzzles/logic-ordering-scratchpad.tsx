"use client";

import React, { useState } from "react";
import { ArrowUp, ArrowDown, Sparkles, Layers, ListOrdered } from "lucide-react";

interface LogicItem {
  id: string;
  label: string;
}

interface LogicOrderingScratchpadProps {
  items: LogicItem[];
  onApplyToAnswer: (sequenceStr: string) => void;
}

export function LogicOrderingScratchpad({
  items: initialItems,
  onApplyToAnswer,
}: LogicOrderingScratchpadProps) {
  const [items, setItems] = useState<LogicItem[]>(initialItems);

  const moveUp = (index: number) => {
    if (index === 0) return;
    const newItems = [...items];
    const temp = newItems[index - 1];
    newItems[index - 1] = newItems[index];
    newItems[index] = temp;
    setItems(newItems);
  };

  const moveDown = (index: number) => {
    if (index === items.length - 1) return;
    const newItems = [...items];
    const temp = newItems[index + 1];
    newItems[index + 1] = newItems[index];
    newItems[index] = temp;
    setItems(newItems);
  };

  const handleApply = () => {
    const sequenceStr = items.map((it) => it.id).join(",");
    onApplyToAnswer(sequenceStr);
  };

  return (
    <div className="rounded-xl bg-[#090f1d] border border-[#1b2742] p-4 space-y-4">
      <div className="flex items-center justify-between pb-2 border-b border-[#162137]">
        <div className="flex items-center gap-2">
          <ListOrdered className="w-4 h-4 text-amber-400" />
          <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-wider font-mono">
            Sequence Ordering Matrix
          </h4>
        </div>
        <span className="text-[10px] font-mono text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/50">
          Chronological Reconstruction
        </span>
      </div>

      <div className="space-y-2">
        {items.map((item, index) => (
          <div
            key={item.id}
            className="flex items-center justify-between gap-3 p-2.5 rounded-lg bg-[#0e1628] border border-[#1e2a42] text-xs font-mono"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="w-5 h-5 rounded bg-[#16223b] text-cyan-300 font-bold flex items-center justify-center text-[11px] shrink-0">
                {index + 1}
              </span>
              <span className="text-slate-200 truncate">{item.label}</span>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => moveUp(index)}
                disabled={index === 0}
                className="p-1 rounded bg-[#141d30] hover:bg-[#1b2844] text-slate-300 disabled:opacity-30 border border-[#23314f]"
                title="Move earlier"
              >
                <ArrowUp className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => moveDown(index)}
                disabled={index === items.length - 1}
                className="p-1 rounded bg-[#141d30] hover:bg-[#1b2844] text-slate-300 disabled:opacity-30 border border-[#23314f]"
                title="Move later"
              >
                <ArrowDown className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={handleApply}
        className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-amber-950/70 hover:bg-amber-900/70 border border-amber-600/50 text-amber-300 text-xs font-mono font-semibold transition-colors"
      >
        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
        <span>Apply Order to Submission</span>
      </button>
    </div>
  );
}
