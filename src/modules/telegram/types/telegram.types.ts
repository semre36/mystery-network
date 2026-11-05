/**
 * MYSTERY NETWORK — Telegram Module Types
 */

export type DeepLinkType = "invite" | "case" | "unknown";

export interface ParsedDeepLink {
  type: DeepLinkType;
  value: string;
  raw: string;
}

export interface TelegramConfig {
  botToken: string;
  botUsername: string;
  webhookSecret: string;
  webhookUrl?: string;
  miniAppUrl?: string;
}

export interface WebhookVerificationResult {
  isValid: boolean;
  reason?: string;
}
