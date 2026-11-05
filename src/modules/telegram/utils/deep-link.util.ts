import type { ParsedDeepLink } from "../types/telegram.types";

/**
 * Telegram deep-linking parameter constraint:
 * 1-64 characters matching [a-zA-Z0-9_-]
 */
const TELEGRAM_DEEP_LINK_REGEX = /^[a-zA-Z0-9_-]{1,64}$/;

/**
 * Parses and validates Telegram start parameter payloads safely.
 * Examples:
 *   "invite_SQ7F2A" -> { type: "invite", value: "SQ7F2A", raw: "invite_SQ7F2A" }
 *   "case_001"      -> { type: "case", value: "001", raw: "case_001" }
 */
export function parseDeepLink(payload?: string): ParsedDeepLink | null {
  if (!payload || typeof payload !== "string") {
    return null;
  }

  const trimmed = payload.trim();
  if (!trimmed || !TELEGRAM_DEEP_LINK_REGEX.test(trimmed)) {
    return null;
  }

  if (trimmed.startsWith("invite_")) {
    const code = trimmed.slice("invite_".length);
    if (code.length > 0) {
      return {
        type: "invite",
        value: code,
        raw: trimmed,
      };
    }
  }

  if (trimmed.startsWith("case_")) {
    const code = trimmed.slice("case_".length);
    if (code.length > 0) {
      return {
        type: "case",
        value: code,
        raw: trimmed,
      };
    }
  }

  return {
    type: "unknown",
    value: trimmed,
    raw: trimmed,
  };
}
