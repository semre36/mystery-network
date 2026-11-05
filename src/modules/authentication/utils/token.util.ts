import crypto from "crypto";

/**
 * Generates a high-entropy 256-bit cryptographically secure session token.
 */
export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Derives a SHA-256 digest of the session token for persistent database storage.
 * Only the digest is stored in PostgreSQL; the plaintext token remains solely in the client cookie.
 */
export function hashSessionToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * Constant-time comparison for token digests.
 */
export function timingSafeEqualHex(a: string, b: string): boolean {
  if (!a || !b || typeof a !== "string" || typeof b !== "string") {
    return false;
  }

  const bufA = Buffer.from(a, "hex");
  const bufB = Buffer.from(b, "hex");

  if (bufA.length === 0 || bufB.length === 0 || bufA.length !== bufB.length) {
    return false;
  }

  return crypto.timingSafeEqual(bufA, bufB);
}
