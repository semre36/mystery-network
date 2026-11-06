"use client";

import React, { useState, useMemo } from "react";
import { KeyRound, RotateCw, Copy, Check, Sparkles } from "lucide-react";

interface CipherScratchpadProps {
  puzzleType: string;
  ciphertext?: string;
  onApplyToAnswer?: (solution: string) => void;
}

export function CipherScratchpad({
  puzzleType,
  ciphertext = "",
  onApplyToAnswer,
}: CipherScratchpadProps) {
  const [shift, setShift] = useState<number>(3);
  const [vigenereKey, setVigenereKey] = useState<string>("");
  const [copied, setCopied] = useState<boolean>(false);

  // Compute Caesar deciphered output
  const caesarDecoded = useMemo(() => {
    if (!ciphertext) return "";
    return ciphertext
      .split("")
      .map((char) => {
        const code = char.charCodeAt(0);
        // Uppercase A-Z
        if (code >= 65 && code <= 90) {
          return String.fromCharCode(((code - 65 - shift + 26) % 26) + 65);
        }
        // Lowercase a-z
        if (code >= 97 && code <= 122) {
          return String.fromCharCode(((code - 97 - shift + 26) % 26) + 97);
        }
        return char;
      })
      .join("");
  }, [ciphertext, shift]);

  // Compute Vigenère deciphered output
  const vigenereDecoded = useMemo(() => {
    if (!ciphertext || !vigenereKey.trim()) return ciphertext;
    const cleanKey = vigenereKey.toUpperCase().replace(/[^A-Z]/g, "");
    if (!cleanKey.length) return ciphertext;

    let keyIndex = 0;
    return ciphertext
      .split("")
      .map((char) => {
        const code = char.charCodeAt(0);
        if (code >= 65 && code <= 90) {
          const shiftVal = cleanKey.charCodeAt(keyIndex % cleanKey.length) - 65;
          keyIndex++;
          return String.fromCharCode(((code - 65 - shiftVal + 26) % 26) + 65);
        }
        if (code >= 97 && code <= 122) {
          const shiftVal = cleanKey.charCodeAt(keyIndex % cleanKey.length) - 65;
          keyIndex++;
          return String.fromCharCode(((code - 97 - shiftVal + 26) % 26) + 97);
        }
        return char;
      })
      .join("");
  }, [ciphertext, vigenereKey]);

  const activeResult =
    puzzleType === "CAESAR_CIPHER"
      ? caesarDecoded
      : puzzleType === "VIGENERE_CIPHER"
        ? vigenereDecoded
        : "";

  const handleCopy = () => {
    if (!activeResult) return;
    navigator.clipboard.writeText(activeResult);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleApply = () => {
    if (!activeResult || !onApplyToAnswer) return;
    onApplyToAnswer(activeResult);
  };

  if (puzzleType !== "CAESAR_CIPHER" && puzzleType !== "VIGENERE_CIPHER") {
    return null;
  }

  return (
    <div className="rounded-xl bg-[#090f1d] border border-[#1b2742] p-4 space-y-4">
      <div className="flex items-center justify-between pb-2 border-b border-[#162137]">
        <div className="flex items-center gap-2">
          <KeyRound className="w-4 h-4 text-cyan-400" />
          <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-wider font-mono">
            Tactical Cryptanalysis Scratchpad
          </h4>
        </div>
        <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/50">
          Client-Side Sandbox
        </span>
      </div>

      {puzzleType === "CAESAR_CIPHER" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-mono text-slate-300">
              Shift Offset: <span className="text-cyan-400 font-bold">-{shift}</span>
            </label>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setShift((s) => (s - 1 + 26) % 26)}
                className="px-2 py-1 bg-[#141d30] hover:bg-[#1b2844] text-slate-300 rounded border border-[#23314f] text-xs font-mono"
              >
                -1
              </button>
              <button
                type="button"
                onClick={() => setShift((s) => (s + 1) % 26)}
                className="px-2 py-1 bg-[#141d30] hover:bg-[#1b2844] text-slate-300 rounded border border-[#23314f] text-xs font-mono"
              >
                +1
              </button>
              <button
                type="button"
                onClick={() => setShift(0)}
                className="p-1 bg-[#141d30] hover:bg-[#1b2844] text-slate-400 rounded border border-[#23314f]"
                title="Reset shift"
              >
                <RotateCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <input
            type="range"
            min={0}
            max={25}
            value={shift}
            onChange={(e) => setShift(Number(e.target.value))}
            className="w-full h-1.5 bg-[#141d30] rounded-lg appearance-none cursor-pointer accent-cyan-400"
          />
        </div>
      )}

      {puzzleType === "VIGENERE_CIPHER" && (
        <div className="space-y-2">
          <label className="text-xs font-mono text-slate-300">Passphrase / Key Word:</label>
          <input
            type="text"
            value={vigenereKey}
            onChange={(e) => setVigenereKey(e.target.value.toUpperCase())}
            placeholder="e.g. SHADOW"
            className="w-full px-3 py-1.5 rounded-lg bg-[#0e1628] border border-[#23314f] text-cyan-300 font-mono text-xs focus:outline-none focus:border-cyan-500 uppercase"
          />
        </div>
      )}

      {/* Output Display */}
      <div className="rounded-lg bg-[#050912] border border-[#18233a] p-3 space-y-2">
        <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">
          Deciphered Preview
        </div>
        <div className="text-sm font-mono text-emerald-400 font-bold break-all tracking-wider min-h-[1.5rem]">
          {activeResult || <span className="text-slate-600">No output</span>}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2 pt-1">
        {onApplyToAnswer && (
          <button
            type="button"
            onClick={handleApply}
            disabled={!activeResult}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-950/70 hover:bg-cyan-900/70 border border-cyan-500/50 text-cyan-300 text-xs font-mono transition-colors disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>Apply to Answer Box</span>
          </button>
        )}

        <button
          type="button"
          onClick={handleCopy}
          disabled={!activeResult}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#141d30] hover:bg-[#1b2844] border border-[#23314f] text-slate-300 text-xs font-mono transition-colors disabled:opacity-50"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span>Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5 text-slate-400" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
