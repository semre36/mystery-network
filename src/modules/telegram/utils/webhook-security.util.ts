import crypto from "crypto";
import type { WebhookVerificationResult } from "../types/telegram.types";

/**
 * Validates the X-Telegram-Bot-Api-Secret-Token header using constant-time comparison.
 */
export function verifyTelegramWebhookSecret(
  incomingSecretHeader: string | null | undefined,
  configuredSecret: string | null | undefined
): WebhookVerificationResult {
  if (!configuredSecret) {
    return {
      isValid: false,
      reason: "TELEGRAM_WEBHOOK_SECRET is not configured on the server",
    };
  }

  if (!incomingSecretHeader) {
    return {
      isValid: false,
      reason: "Missing X-Telegram-Bot-Api-Secret-Token header",
    };
  }

  const incomingBuffer = Buffer.from(incomingSecretHeader, "utf8");
  const configuredBuffer = Buffer.from(configuredSecret, "utf8");

  // Constant-time length and content comparison to avoid timing vulnerabilities
  if (incomingBuffer.length !== configuredBuffer.length) {
    return {
      isValid: false,
      reason: "Secret token length mismatch",
    };
  }

  const isValid = crypto.timingSafeEqual(incomingBuffer, configuredBuffer);

  return {
    isValid,
    ...(isValid ? {} : { reason: "Secret token mismatch" }),
  };
}
