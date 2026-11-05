"use client";

import { useEffect, useState, useCallback } from "react";
import { ShieldCheck, UserCheck, LogOut, AlertCircle, RefreshCw, Send } from "lucide-react";
import type { SafeUserProfile } from "@/modules/authentication/types/auth.types";

interface TelegramWebApp {
  initData?: string;
  ready?: () => void;
  expand?: () => void;
  close?: () => void;
}

declare global {
  interface Window {
    Telegram?: {
      WebApp?: TelegramWebApp;
    };
  }
}

type AuthState =
  | { status: "idle" }
  | { status: "loading"; message: string }
  | { status: "authenticated"; user: SafeUserProfile }
  | { status: "unauthenticated"; reason?: string }
  | { status: "outside_telegram" }
  | { status: "error"; message: string };

export function TelegramAuthWidget() {
  const [state, setState] = useState<AuthState>({ status: "idle" });

  // 1. Check existing session on mount
  const checkExistingSession = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/session");
      if (!res.ok) {
        return false;
      }
      const data = await res.json();
      if (data.authenticated && data.user) {
        setState({ status: "authenticated", user: data.user });
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, []);

  // 2. Perform authentication with raw initData
  const authenticateWithInitData = useCallback(async (initData: string) => {
    setState({
      status: "loading",
      message: "Verifying credentials with Telegram Bot API...",
    });

    try {
      const res = await fetch("/api/auth/telegram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ initData }),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        setState({
          status: "error",
          message: data.error || "Authentication verification failed.",
        });
        return;
      }

      setState({ status: "authenticated", user: data.user });
    } catch {
      setState({
        status: "error",
        message: "Network interruption during authentication handshake.",
      });
    }
  }, []);

  // 3. Handle Logout
  const handleLogout = async () => {
    setState({ status: "loading", message: "Terminating operative session..." });
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      setState({
        status: "unauthenticated",
        reason: "Session terminated.",
      });
    }
  };

  useEffect(() => {
    let isMounted = true;

    async function init() {
      // First, see if an active valid session cookie already exists
      const hasActiveSession = await checkExistingSession();
      if (!isMounted || hasActiveSession) return;

      // Check for Telegram WebApp environment
      const tg = typeof window !== "undefined" ? window.Telegram?.WebApp : undefined;
      tg?.ready?.();
      tg?.expand?.();

      const rawInitData = tg?.initData;

      if (rawInitData && rawInitData.trim().length > 0) {
        // Authenticate using cryptographically signed initData
        await authenticateWithInitData(rawInitData);
      } else {
        // Opened in normal desktop/mobile browser outside Telegram
        setState({ status: "outside_telegram" });
      }
    }

    init();

    return () => {
      isMounted = false;
    };
  }, [checkExistingSession, authenticateWithInitData]);

  // Render based on state
  if (state.status === "loading") {
    return (
      <div className="border border-[#1a233a] bg-[#101726]/60 rounded-lg p-5 flex items-center gap-3 text-slate-300">
        <RefreshCw className="w-5 h-5 animate-spin text-blue-400 shrink-0" />
        <span className="text-sm font-mono">{state.message}</span>
      </div>
    );
  }

  if (state.status === "authenticated") {
    const { user } = state;
    return (
      <div className="border border-blue-900/40 bg-[#0f1b33]/40 rounded-lg p-5 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded bg-blue-950/60 border border-blue-800/50 text-blue-400">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-mono uppercase tracking-wider text-blue-400 block">
                Operative Authenticated
              </span>
              <h3 className="text-base font-semibold text-slate-100 font-mono">
                {user.profile?.codename ?? "AGENT"}
              </h3>
            </div>
          </div>
          <span className="text-xs font-mono px-2.5 py-1 rounded bg-blue-950 border border-blue-800 text-blue-300">
            Rank: Level {user.profile?.level ?? 1}
          </span>
        </div>

        <div className="border-t border-[#1a233a] pt-3 text-xs font-mono text-slate-400 flex items-center justify-between">
          <span>Ident: {user.profile?.displayName ?? "Investigator"}</span>
          <span>Status: Verified</span>
        </div>

        <div className="pt-1 flex justify-end">
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center gap-2 text-xs font-mono px-3 py-1.5 rounded bg-[#131b2e] hover:bg-[#1a233a] border border-[#232f48] text-slate-300 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  if (state.status === "outside_telegram") {
    return (
      <div className="border border-[#1a233a] bg-[#101726]/70 rounded-lg p-5 space-y-3">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded bg-[#162035] border border-[#232f48] text-slate-400 shrink-0">
            <ShieldCheck className="w-5 h-5 text-blue-400" />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-semibold text-slate-200 font-sans">
              Telegram Verification Required
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              To authenticate your investigator clearance and decrypt active cases, open MYSTERY
              NETWORK through our official Telegram Bot.
            </p>
          </div>
        </div>

        <div className="pt-2">
          <a
            href="https://t.me/mysterynetworkbot"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-xs font-mono px-3.5 py-2 rounded bg-blue-600 hover:bg-blue-500 text-white font-medium transition-colors"
          >
            <Send className="w-3.5 h-3.5" />
            Open @mysterynetworkbot
          </a>
        </div>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="border border-red-900/40 bg-red-950/20 rounded-lg p-5 space-y-3">
        <div className="flex items-center gap-3 text-red-400">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span className="text-xs font-mono uppercase tracking-wider font-semibold">
            Clearance Verification Error
          </span>
        </div>
        <p className="text-xs text-slate-300 font-mono">{state.message}</p>
        <button
          type="button"
          onClick={() => {
            const raw = window.Telegram?.WebApp?.initData;
            if (raw) authenticateWithInitData(raw);
            else setState({ status: "outside_telegram" });
          }}
          className="inline-flex items-center gap-1.5 text-xs font-mono px-3 py-1.5 rounded bg-[#131b2e] hover:bg-[#1a233a] border border-[#232f48] text-slate-300"
        >
          <RefreshCw className="w-3 h-3" /> Retry Handshake
        </button>
      </div>
    );
  }

  return null;
}
