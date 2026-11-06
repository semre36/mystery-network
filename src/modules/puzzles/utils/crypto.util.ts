import crypto from "crypto";
import { NormalizationOptions } from "../types/puzzle.types";

const SERVER_SECRET =
  process.env.SESSION_SECRET ||
  process.env.TELEGRAM_BOT_TOKEN ||
  "mystery-network-secure-puzzle-salt-2026";

/**
 * Normalizes answer text based on challenge rules.
 */
export function normalizeAnswer(text: string, options: NormalizationOptions = {}): string {
  if (!text) return "";

  // 1. Unicode NFKC normalization
  let normalized = text.normalize("NFKC");

  // 2. Case normalization (default case-insensitive unless explicitly requested)
  if (!options.caseSensitive) {
    normalized = normalized.toUpperCase();
  }

  // 3. Punctuation handling
  if (options.stripPunctuation) {
    // Remove all punctuation and symbols, keeping alphanumeric characters
    normalized = normalized.replace(/[^\p{L}\p{N}\s]/gu, "");
  }

  // 4. Whitespace handling
  if (options.stripWhitespace) {
    // Remove all whitespace entirely
    normalized = normalized.replace(/\s+/g, "");
  } else if (options.collapseWhitespace !== false) {
    // Collapse multi-spaces and trim edges
    normalized = normalized.trim().replace(/\s+/g, " ");
  } else {
    normalized = normalized.trim();
  }

  return normalized;
}

/**
 * Computes a keyed HMAC-SHA256 hash of an answer string with an optional puzzle-specific salt.
 * Protects low-entropy answers (like PIN codes or simple words) from offline rainbow-table attacks.
 */
export function hashAnswer(answer: string, salt: string = ""): string {
  const hmac = crypto.createHmac("sha256", SERVER_SECRET);
  hmac.update(`${salt}:${answer.trim()}`);
  return hmac.digest("hex");
}

/**
 * Verifies if an answer matches an expected hash or plaintext solution.
 */
export function verifyAnswerMatch(
  submittedAnswer: string,
  expectedHash: string,
  salt: string = "",
  options: NormalizationOptions = {}
): boolean {
  const normalized = normalizeAnswer(submittedAnswer, options);
  const submittedHash = hashAnswer(normalized, salt);

  // Constant-time comparison to prevent timing attacks
  const bufA = Buffer.from(submittedHash, "hex");
  const bufB = Buffer.from(expectedHash, "hex");

  if (bufA.length !== bufB.length) {
    return false;
  }

  return crypto.timingSafeEqual(bufA, bufB);
}
