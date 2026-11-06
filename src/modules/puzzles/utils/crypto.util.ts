import crypto from "crypto";
import { NormalizationOptions } from "../types/puzzle.types";

function getServerSecret(): string {
  const secret =
    process.env.PUZZLE_HMAC_SECRET || process.env.SESSION_SECRET || process.env.TELEGRAM_BOT_TOKEN;

  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "CRITICAL: Missing server secret for puzzle answer hashing. PUZZLE_HMAC_SECRET or SESSION_SECRET must be configured."
      );
    }
    return "mystery-network-dev-salt-2026";
  }

  if (process.env.NODE_ENV === "production" && secret.length < 32) {
    throw new Error(
      "CRITICAL: Server secret has inadequate entropy (must be at least 32 characters in production)."
    );
  }

  return secret;
}

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
  const secret = getServerSecret();
  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(`${salt}:${answer.trim()}`);
  return hmac.digest("hex");
}

/**
 * Verifies if an answer matches an expected hash or plaintext solution.
 * Employs constant-time equality check to defeat timing attacks.
 */
export function verifyAnswerMatch(
  submittedAnswer: string,
  expectedHash: string,
  salt: string = "",
  options: NormalizationOptions = {}
): boolean {
  if (!expectedHash || expectedHash.length !== 64 || !/^[0-9a-f]{64}$/i.test(expectedHash)) {
    return false;
  }

  const normalized = normalizeAnswer(submittedAnswer, options);
  const submittedHash = hashAnswer(normalized, salt);

  const bufA = Buffer.from(submittedHash, "hex");
  const bufB = Buffer.from(expectedHash, "hex");

  if (bufA.length !== bufB.length) {
    return false;
  }

  return crypto.timingSafeEqual(bufA, bufB);
}
