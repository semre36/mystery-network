import type { AuthSession, User, PlayerProfile } from "@prisma/client";

/**
 * Verified user payload extracted from Telegram WebApp initData.
 */
export interface TelegramInitDataUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
}

/**
 * Validated authentication result after cryptographic HMAC check.
 */
export interface ValidatedTelegramAuth {
  user: TelegramInitDataUser;
  authDate: Date;
  queryId?: string;
  raw: string;
}

/**
 * Safe public representation of an investigator user and profile.
 * Excludes internal hashes, secrets, and raw database IDs where appropriate.
 */
export interface SafeUserProfile {
  id: string;
  telegramId: string; // Serialized as string to eliminate 64-bit BigInt precision truncation
  telegramUsername: string | null;
  firstName: string | null;
  lastName: string | null;
  languageCode: string | null;
  status: string;
  createdAt: string;
  profile: {
    id: string;
    codename: string;
    displayName: string;
    avatarUrl: string | null;
    xp: number;
    level: number;
    preferences: unknown;
  } | null;
}

/**
 * Session verification outcome.
 */
export type SessionValidationResult =
  | {
      authenticated: true;
      user: SafeUserProfile;
      session: AuthSession;
    }
  | {
      authenticated: false;
      reason: string;
    };

/**
 * Helper to transform User & PlayerProfile to SafeUserProfile DTO.
 */
export function toSafeUserProfile(
  user: User & { profile?: PlayerProfile | null }
): SafeUserProfile {
  return {
    id: user.id,
    telegramId: user.telegramId.toString(),
    telegramUsername: user.telegramUsername,
    firstName: user.firstName,
    lastName: user.lastName,
    languageCode: user.languageCode,
    status: user.status,
    createdAt: user.createdAt.toISOString(),
    profile: user.profile
      ? {
          id: user.profile.id,
          codename: user.profile.codename,
          displayName: user.profile.displayName,
          avatarUrl: user.profile.avatarUrl,
          xp: user.profile.xp,
          level: user.profile.level,
          preferences: user.profile.preferences,
        }
      : null,
  };
}
