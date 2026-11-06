"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
  Save,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Lock,
  Sparkles,
} from "lucide-react";
import { AVAILABLE_SPECIALIZATIONS } from "@/modules/players/utils/rank.util";
import type { PlayerDossier } from "@/modules/players/types/player.types";

interface ProfileFormProps {
  dossier: PlayerDossier;
}

export function ProfileForm({ dossier }: ProfileFormProps) {
  const router = useRouter();

  const [codename, setCodename] = useState(dossier.codename);
  const [displayName, setDisplayName] = useState(dossier.displayName);
  const [specialization, setSpecialization] = useState(dossier.specialization);
  const [theme, setTheme] = useState<"navy" | "noir">(
    dossier.preferences.theme === "noir" ? "noir" : "navy"
  );
  const [languageCode, setLanguageCode] = useState(dossier.preferences.language ?? "en");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch("/api/player/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          codename: codename.trim(),
          displayName: displayName.trim(),
          specialization,
          theme,
          languageCode: languageCode.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        setErrorMsg(data.error || "Failed to update profile.");
        return;
      }

      setSuccessMsg("Investigator dossier updated successfully.");
      router.refresh();
    } catch {
      setErrorMsg("Network disruption during profile update handshake.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Alert Notices */}
      {errorMsg && (
        <div className="border border-red-900/40 bg-red-950/20 rounded-lg p-4 flex items-center gap-3 text-red-400">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span className="text-xs font-mono">{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="border border-emerald-900/40 bg-emerald-950/20 rounded-lg p-4 flex items-center gap-3 text-emerald-400">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span className="text-xs font-mono">{successMsg}</span>
        </div>
      )}

      {/* Editable Clearance Configuration */}
      <div className="bg-[#0f1523] border border-[#1a233a] rounded-lg p-6 shadow-xl space-y-6">
        <div className="border-b border-[#18233c] pb-3 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold tracking-tight text-slate-100 font-sans">
              Operative Identification
            </h3>
            <span className="text-[11px] font-mono text-slate-400">
              Configurable public callsign and field identity.
            </span>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950/70 border border-cyan-800 text-cyan-300">
            ID: {dossier.id.slice(0, 8).toUpperCase()}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* Callsign / Codename */}
          <div className="space-y-2">
            <label
              htmlFor="codename"
              className="text-xs font-mono uppercase tracking-wider text-slate-300 block font-semibold"
            >
              Operative Callsign / Codename
            </label>
            <div className="relative">
              <input
                id="codename"
                type="text"
                value={codename}
                onChange={(e) => setCodename(e.target.value.toUpperCase())}
                required
                minLength={3}
                maxLength={30}
                className="w-full bg-[#0b101c] border border-[#22304d] focus:border-cyan-500 rounded px-3 py-2 text-xs font-mono text-cyan-300 focus:outline-none transition-colors"
                placeholder="AGENT_CODENAME"
              />
            </div>
            <p className="text-[10px] font-mono text-slate-400">
              Must be unique across the network. Letters, numbers, and underscores only.
            </p>
          </div>

          {/* Display Name */}
          <div className="space-y-2">
            <label
              htmlFor="displayName"
              className="text-xs font-mono uppercase tracking-wider text-slate-300 block font-semibold"
            >
              Public Investigator Name
            </label>
            <input
              id="displayName"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
              minLength={1}
              maxLength={50}
              className="w-full bg-[#0b101c] border border-[#22304d] focus:border-cyan-500 rounded px-3 py-2 text-xs font-sans text-slate-100 focus:outline-none transition-colors"
              placeholder="e.g. Inspector John Watson"
            />
            <p className="text-[10px] font-mono text-slate-400">
              The primary signature displayed to team operatives during squad briefings.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 pt-2 border-t border-[#18233c]">
          {/* Specialization */}
          <div className="space-y-2">
            <label
              htmlFor="specialization"
              className="text-xs font-mono uppercase tracking-wider text-slate-300 block font-semibold"
            >
              Investigative Specialization
            </label>
            <select
              id="specialization"
              value={specialization}
              onChange={(e) => setSpecialization(e.target.value)}
              className="w-full bg-[#0b101c] border border-[#22304d] focus:border-cyan-500 rounded px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none transition-colors"
            >
              {AVAILABLE_SPECIALIZATIONS.map((spec) => (
                <option key={spec} value={spec}>
                  {spec}
                </option>
              ))}
            </select>
          </div>

          {/* Theme Preference */}
          <div className="space-y-2">
            <label
              htmlFor="theme"
              className="text-xs font-mono uppercase tracking-wider text-slate-300 block font-semibold"
            >
              Interface Theme Palette
            </label>
            <select
              id="theme"
              value={theme}
              onChange={(e) => setTheme(e.target.value as "navy" | "noir")}
              className="w-full bg-[#0b101c] border border-[#22304d] focus:border-cyan-500 rounded px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none transition-colors"
            >
              <option value="navy">Intelligence Navy (Standard)</option>
              <option value="noir">Classified Noir (High Contrast)</option>
            </select>
          </div>

          {/* Language Preference */}
          <div className="space-y-2">
            <label
              htmlFor="language"
              className="text-xs font-mono uppercase tracking-wider text-slate-300 block font-semibold"
            >
              Preferred Language
            </label>
            <select
              id="language"
              value={languageCode}
              onChange={(e) => setLanguageCode(e.target.value)}
              className="w-full bg-[#0b101c] border border-[#22304d] focus:border-cyan-500 rounded px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none transition-colors"
            >
              <option value="en">English (US)</option>
              <option value="es">Español</option>
              <option value="tr">Türkçe</option>
              <option value="fr">Français</option>
              <option value="de">Deutsch</option>
            </select>
          </div>
        </div>
      </div>

      {/* Immutable / Protected Security Clearance Section */}
      <div className="bg-[#0b101c] border border-[#18233a] rounded-lg p-5 space-y-4">
        <div className="flex items-center gap-2 border-b border-[#18233c] pb-2 text-xs font-mono text-slate-400">
          <Lock className="w-4 h-4 text-amber-400" />
          <span className="font-semibold uppercase tracking-wider text-slate-300">
            Immutable Intelligence Clearance & Security Records
          </span>
        </div>

        <p className="text-xs text-slate-400 leading-relaxed font-sans">
          The following security attributes are verified by the central consensus engine and cannot
          be manually modified by clients or operatives. Progression is earned solely through case
          solutions.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
          <div className="p-2.5 rounded bg-[#070b13] border border-[#141d2e]">
            <span className="text-[10px] font-mono uppercase text-slate-500 block mb-0.5">
              Rank Tier
            </span>
            <span className="text-xs font-mono text-slate-200 font-semibold block">
              {dossier.rank.title}
            </span>
          </div>

          <div className="p-2.5 rounded bg-[#070b13] border border-[#141d2e]">
            <span className="text-[10px] font-mono uppercase text-slate-500 block mb-0.5">
              Operational Level
            </span>
            <span className="text-xs font-mono text-cyan-300 font-semibold block">
              Level {dossier.level}
            </span>
          </div>

          <div className="p-2.5 rounded bg-[#070b13] border border-[#141d2e]">
            <span className="text-[10px] font-mono uppercase text-slate-500 block mb-0.5">
              Accrued XP
            </span>
            <span className="text-xs font-mono text-amber-300 font-semibold block">
              {dossier.xp.toLocaleString()} XP
            </span>
          </div>

          <div className="p-2.5 rounded bg-[#070b13] border border-[#141d2e]">
            <span className="text-[10px] font-mono uppercase text-slate-500 block mb-0.5">
              Account Status
            </span>
            <span className="text-xs font-mono text-emerald-400 font-semibold block">
              {dossier.status}
            </span>
          </div>
        </div>
      </div>

      {/* Submission Action */}
      <div className="flex justify-end pt-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded bg-blue-600 hover:bg-blue-500 disabled:bg-blue-900/50 text-white font-medium text-xs font-mono transition-colors shadow-lg shadow-blue-900/30"
        >
          {isSubmitting ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              Recording Clearance...
            </>
          ) : (
            <>
              <Save className="w-3.5 h-3.5" />
              Save Dossier Updates
            </>
          )}
        </button>
      </div>
    </form>
  );
}
