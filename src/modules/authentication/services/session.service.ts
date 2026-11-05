import { prisma } from "@/server/infrastructure/database";
import { logger } from "@/lib/logger";
import { generateSessionToken, hashSessionToken } from "../utils/token.util";
import { SESSION_MAX_AGE_SECONDS } from "../constants/auth.constants";
import {
  toSafeUserProfile,
  type SafeUserProfile,
  type SessionValidationResult,
} from "../types/auth.types";
import type { AuthSession } from "@prisma/client";

export interface CreateSessionResult {
  rawToken: string;
  session: AuthSession;
  user: SafeUserProfile;
}

export class SessionService {
  /**
   * Creates a new server-side AuthSession with a 256-bit entropy token.
   * Only the SHA-256 digest is stored in the database.
   */
  public static async createSession(
    userId: string,
    metadata?: { userAgent?: string; ipAddress?: string }
  ): Promise<CreateSessionResult> {
    const rawToken = generateSessionToken();
    const tokenHash = hashSessionToken(rawToken);
    const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000);

    const session = await prisma.authSession.create({
      data: {
        userId,
        tokenHash,
        expiresAt,
        userAgent: metadata?.userAgent?.slice(0, 500),
        ipAddress: metadata?.ipAddress?.slice(0, 100),
        lastActivityAt: new Date(),
      },
      include: {
        user: {
          include: { profile: true },
        },
      },
    });

    logger.info("Created new server-side session", {
      sessionId: session.id,
      userId: session.userId,
      expiresAt: session.expiresAt.toISOString(),
    });

    return {
      rawToken,
      session,
      user: toSafeUserProfile(session.user),
    };
  }

  /**
   * Validates a raw session token against active database records.
   * Rejects expired, revoked, or non-existent sessions.
   */
  public static async validateSession(rawToken?: string | null): Promise<SessionValidationResult> {
    if (!rawToken || typeof rawToken !== "string" || !rawToken.trim()) {
      return { authenticated: false, reason: "Missing session token" };
    }

    const tokenHash = hashSessionToken(rawToken.trim());

    const session = await prisma.authSession.findUnique({
      where: { tokenHash },
      include: {
        user: {
          include: { profile: true },
        },
      },
    });

    if (!session) {
      return { authenticated: false, reason: "Session not found" };
    }

    if (session.revokedAt !== null) {
      return { authenticated: false, reason: "Session has been revoked" };
    }

    if (session.expiresAt.getTime() <= Date.now()) {
      return { authenticated: false, reason: "Session has expired" };
    }

    // Touch lastActivityAt if older than 5 minutes to avoid excessive DB writes
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    if (session.lastActivityAt.getTime() < fiveMinutesAgo) {
      // Fire and forget activity timestamp update
      prisma.authSession
        .update({
          where: { id: session.id },
          data: { lastActivityAt: new Date() },
        })
        .catch((err) => {
          logger.warn("Failed to touch session lastActivityAt", {
            sessionId: session.id,
            error: err instanceof Error ? err.message : String(err),
          });
        });
    }

    return {
      authenticated: true,
      user: toSafeUserProfile(session.user),
      session,
    };
  }

  /**
   * Explicitly revokes an active session by token hash.
   */
  public static async revokeSession(rawToken?: string | null): Promise<boolean> {
    if (!rawToken || typeof rawToken !== "string") {
      return false;
    }

    const tokenHash = hashSessionToken(rawToken.trim());

    try {
      const updated = await prisma.authSession.updateMany({
        where: {
          tokenHash,
          revokedAt: null,
        },
        data: {
          revokedAt: new Date(),
        },
      });

      const revoked = updated.count > 0;
      if (revoked) {
        logger.info("Session revoked successfully");
      }
      return revoked;
    } catch (err) {
      logger.error("Failed to revoke session", {
        error: err instanceof Error ? err.message : String(err),
      });
      return false;
    }
  }

  /**
   * Revokes all active sessions for a user (e.g. on security resets).
   */
  public static async revokeAllUserSessions(userId: string): Promise<number> {
    const updated = await prisma.authSession.updateMany({
      where: {
        userId,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });

    logger.info("Revoked all active user sessions", {
      userId,
      count: updated.count,
    });

    return updated.count;
  }
}
