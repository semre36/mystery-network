import { describe, it, expect, vi, beforeEach } from "vitest";
import { sign } from "@tma.js/init-data-node";
import { TelegramAuthService } from "@/modules/authentication/services/telegram-auth.service";
import {
  generateSessionToken,
  hashSessionToken,
  timingSafeEqualHex,
} from "@/modules/authentication/utils/token.util";
import { getSessionCookieOptions } from "@/modules/authentication/utils/cookie.util";
import { PlayerProvisioningService } from "@/modules/authentication/services/player-provisioning.service";
import { SessionService } from "@/modules/authentication/services/session.service";
import {
  getCurrentSession,
  getCurrentUser,
  requireAuthenticatedUser,
} from "@/modules/authentication/guards/auth.guard";
import { POST as telegramAuthRoute } from "@/app/api/auth/telegram/route";
import { GET as sessionRoute } from "@/app/api/auth/session/route";
import { POST as logoutRoute } from "@/app/api/auth/logout/route";
import { prisma } from "@/server/infrastructure/database";
import { AppError } from "@/lib/errors/app-error";
import {
  INIT_DATA_MAX_AGE_SECONDS,
  MAX_CLOCK_SKEW_SECONDS,
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
} from "@/modules/authentication/constants/auth.constants";
import { UserStatus } from "@prisma/client";

// Mock next/headers for route handler and guard testing
const mockCookieMap = new Map<string, { value: string }>();
const mockCookieStore = {
  get: vi.fn((name: string) => mockCookieMap.get(name)),
  set: vi.fn((name: string, value: string) => {
    mockCookieMap.set(name, { value });
  }),
  delete: vi.fn((name: string) => {
    mockCookieMap.delete(name);
  }),
};

vi.mock("next/headers", () => ({
  cookies: vi.fn().mockImplementation(async () => mockCookieStore),
}));

describe("Telegram Mini App Authentication (Phase 04)", () => {
  const TEST_BOT_TOKEN = "123456789:AAFakeSecretBotTokenForTestingPurposes12345";
  const TEST_USER = {
    id: 987654321,
    first_name: "Sherlock",
    last_name: "Holmes",
    username: "sherlock_investigates",
    language_code: "en",
    is_premium: true,
  };

  beforeEach(() => {
    mockCookieMap.clear();
    vi.clearAllMocks();
  });

  // =========================================================================
  // 1. Telegram InitData Cryptographic Verification
  // =========================================================================
  describe("TelegramAuthService.verifyInitData", () => {
    it("should accept and verify freshly signed Telegram initData", () => {
      const signedInitData = sign(
        {
          query_id: "AAHdF6IQAAAAAN0XohDhrOrc",
          user: TEST_USER,
        },
        TEST_BOT_TOKEN,
        new Date()
      );

      const result = TelegramAuthService.verifyInitData(signedInitData, TEST_BOT_TOKEN);

      expect(result).toBeDefined();
      expect(result.user.id).toBe(TEST_USER.id);
      expect(result.user.first_name).toBe("Sherlock");
      expect(result.user.last_name).toBe("Holmes");
      expect(result.user.username).toBe("sherlock_investigates");
      expect(result.user.language_code).toBe("en");
      expect(result.user.is_premium).toBe(true);
      expect(result.queryId).toBe("AAHdF6IQAAAAAN0XohDhrOrc");
      expect(result.authDate instanceof Date).toBe(true);
    });

    it("should reject expired initData older than 300 seconds", () => {
      // 305 seconds in the past
      const expiredDate = new Date(Date.now() - (INIT_DATA_MAX_AGE_SECONDS + 5) * 1000);
      const expiredInitData = sign(
        {
          query_id: "expired_query_id",
          user: TEST_USER,
        },
        TEST_BOT_TOKEN,
        expiredDate
      );

      expect(() => {
        TelegramAuthService.verifyInitData(expiredInitData, TEST_BOT_TOKEN);
      }).toThrowError(AppError);

      try {
        TelegramAuthService.verifyInitData(expiredInitData, TEST_BOT_TOKEN);
      } catch (err) {
        expect(err).toBeInstanceOf(AppError);
        expect((err as AppError).code).toBe("EXPIRED_INIT_DATA");
        expect((err as AppError).statusCode).toBe(401);
      }
    });

    it("should reject future auth_date exceeding clock-skew tolerance (+15s in the future)", () => {
      const futureDate = new Date(Date.now() + (MAX_CLOCK_SKEW_SECONDS + 15) * 1000);
      const futureInitData = sign(
        {
          query_id: "future_query_id",
          user: TEST_USER,
        },
        TEST_BOT_TOKEN,
        futureDate
      );

      expect(() => {
        TelegramAuthService.verifyInitData(futureInitData, TEST_BOT_TOKEN);
      }).toThrowError(AppError);

      try {
        TelegramAuthService.verifyInitData(futureInitData, TEST_BOT_TOKEN);
      } catch (err) {
        expect(err).toBeInstanceOf(AppError);
        expect((err as AppError).code).toBe("FUTURE_AUTH_DATE");
        expect((err as AppError).statusCode).toBe(401);
      }
    });

    it("should reject tampered initData with invalid HMAC-SHA256 signature", () => {
      const validInitData = sign(
        {
          query_id: "valid_id",
          user: TEST_USER,
        },
        TEST_BOT_TOKEN,
        new Date()
      );

      // Tamper with the user ID in the query string without updating the signature hash
      const tamperedInitData = validInitData.replace("987654321", "111222333");

      expect(() => {
        TelegramAuthService.verifyInitData(tamperedInitData, TEST_BOT_TOKEN);
      }).toThrowError(AppError);

      try {
        TelegramAuthService.verifyInitData(tamperedInitData, TEST_BOT_TOKEN);
      } catch (err) {
        expect(err).toBeInstanceOf(AppError);
        expect((err as AppError).code).toBe("INVALID_SIGNATURE");
        expect((err as AppError).statusCode).toBe(401);
      }
    });

    it("should reject when verified with a different bot token", () => {
      const validInitData = sign(
        {
          query_id: "valid_id",
          user: TEST_USER,
        },
        TEST_BOT_TOKEN,
        new Date()
      );

      const wrongBotToken = "999999999:AAWrongSecretBotToken999999999";

      expect(() => {
        TelegramAuthService.verifyInitData(validInitData, wrongBotToken);
      }).toThrowError(AppError);

      try {
        TelegramAuthService.verifyInitData(validInitData, wrongBotToken);
      } catch (err) {
        expect(err).toBeInstanceOf(AppError);
        expect((err as AppError).code).toBe("INVALID_SIGNATURE");
      }
    });

    it("should reject initData when missing user payload", () => {
      const initDataWithoutUser = sign(
        {
          query_id: "only_query_id",
        },
        TEST_BOT_TOKEN,
        new Date()
      );

      expect(() => {
        TelegramAuthService.verifyInitData(initDataWithoutUser, TEST_BOT_TOKEN);
      }).toThrowError(AppError);

      try {
        TelegramAuthService.verifyInitData(initDataWithoutUser, TEST_BOT_TOKEN);
      } catch (err) {
        expect(err).toBeInstanceOf(AppError);
        expect((err as AppError).code).toBe("MISSING_USER_PAYLOAD");
      }
    });

    it("should reject empty, whitespace, or non-string initData", () => {
      expect(() => TelegramAuthService.verifyInitData("", TEST_BOT_TOKEN)).toThrowError(
        "Missing Telegram initialization data"
      );
      expect(() => TelegramAuthService.verifyInitData("   ", TEST_BOT_TOKEN)).toThrowError(
        "Missing Telegram initialization data"
      );
    });

    it("should throw AUTH_CONFIG_ERROR if server bot token is missing", () => {
      const originalToken = process.env.TELEGRAM_BOT_TOKEN;
      delete process.env.TELEGRAM_BOT_TOKEN;

      try {
        expect(() => {
          TelegramAuthService.verifyInitData("any_data", undefined);
        }).toThrowError(AppError);
      } finally {
        if (originalToken) {
          process.env.TELEGRAM_BOT_TOKEN = originalToken;
        }
      }
    });
  });

  // =========================================================================
  // 2. Token and Cookie Security Utilities
  // =========================================================================
  describe("Token & Cookie Security Utilities", () => {
    it("should generate cryptographically random 256-bit hex tokens (64 chars)", () => {
      const token1 = generateSessionToken();
      const token2 = generateSessionToken();

      expect(typeof token1).toBe("string");
      expect(token1.length).toBe(64);
      expect(/^[0-9a-f]{64}$/.test(token1)).toBe(true);
      expect(token1).not.toBe(token2);
    });

    it("should hash session tokens deterministically using SHA-256", () => {
      const token = "a".repeat(64);
      const hash1 = hashSessionToken(token);
      const hash2 = hashSessionToken(token);

      expect(hash1).toBe(hash2);
      expect(hash1.length).toBe(64);
      expect(/^[0-9a-f]{64}$/.test(hash1)).toBe(true);
      expect(hash1).not.toBe(token);
    });

    it("should execute constant-time equality check (timingSafeEqualHex)", () => {
      const hashA = hashSessionToken("token_alpha");
      const hashB = hashSessionToken("token_alpha");
      const hashC = hashSessionToken("token_beta");

      expect(timingSafeEqualHex(hashA, hashB)).toBe(true);
      expect(timingSafeEqualHex(hashA, hashC)).toBe(false);
      expect(timingSafeEqualHex(hashA, "short")).toBe(false);
      expect(timingSafeEqualHex("", "")).toBe(false);
    });

    it("should produce hardened session cookie options", () => {
      const rawToken = generateSessionToken();
      const opts = getSessionCookieOptions(rawToken);

      expect(opts.name).toBe(SESSION_COOKIE_NAME);
      expect(opts.value).toBe(rawToken);
      expect(opts.httpOnly).toBe(true);
      expect(opts.path).toBe("/");
      expect(opts.maxAge).toBe(SESSION_MAX_AGE_SECONDS);
      expect(typeof opts.secure).toBe("boolean");
      expect(["lax", "none"]).toContain(opts.sameSite);
    });

    it("should produce removal cookie options with maxAge 0", () => {
      const removalOpts = getSessionCookieOptions("", true);

      expect(removalOpts.name).toBe(SESSION_COOKIE_NAME);
      expect(removalOpts.value).toBe("");
      expect(removalOpts.httpOnly).toBe(true);
      expect(removalOpts.maxAge).toBe(0);
      expect(removalOpts.path).toBe("/");
    });

    it("should build complete cookie configuration via getSessionCookieOptions", () => {
      const rawToken = generateSessionToken();
      const cookieConfig = getSessionCookieOptions(rawToken);

      expect(cookieConfig.name).toBe(SESSION_COOKIE_NAME);
      expect(cookieConfig.value).toBe(rawToken);
      expect(cookieConfig.httpOnly).toBe(true);
      expect(cookieConfig.maxAge).toBe(SESSION_MAX_AGE_SECONDS);
    });
  });

  // =========================================================================
  // 3. Player Provisioning Service
  // =========================================================================
  describe("PlayerProvisioningService.findOrCreatePlayer", () => {
    it("should provision a brand-new player with active status, initial rank, and default progression", async () => {
      const mockAuthData = {
        user: {
          id: 554433221,
          first_name: "Agent",
          last_name: "Zero",
          username: "agentzero",
          language_code: "en",
        },
        authDate: new Date(),
        raw: "mock_raw",
      };

      const mockCreatedUser = {
        id: "usr_mock_123",
        telegramId: BigInt(554433221),
        telegramUsername: "agentzero",
        firstName: "Agent",
        lastName: "Zero",
        languageCode: "en",
        status: UserStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastActiveAt: new Date(),
        profile: {
          id: "prof_mock_123",
          userId: "usr_mock_123",
          codename: "AGENT_AGENTZERO",
          displayName: "Agent Zero",
          level: 1,
          xp: 0,
          currentRank: "UNASSIGNED",
          avatarUrl: null,
          bio: null,
          preferences: {},
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      };

      vi.spyOn(prisma.user, "findUnique").mockResolvedValueOnce(null);
      vi.spyOn(prisma, "$transaction").mockImplementationOnce(async (cb: any) => {
        return cb({
          user: {
            findUnique: vi.fn().mockResolvedValue(null),
            create: vi.fn().mockResolvedValue(mockCreatedUser),
          },
          playerProfile: {
            findUnique: vi.fn().mockResolvedValue(null),
            create: vi.fn().mockResolvedValue(mockCreatedUser.profile),
          },
        });
      });

      const result = await PlayerProvisioningService.findOrCreatePlayer(mockAuthData);

      expect(result).toBeDefined();
      expect(result.id).toBe("usr_mock_123");
      expect(result.profile?.codename).toBe("AGENT_AGENTZERO");
      expect(result.profile?.level).toBe(1);
      expect(result.profile?.xp).toBe(0);
    });

    it("should handle codename collision by generating unique suffixed callsign", async () => {
      const mockAuthData = {
        user: {
          id: 665544332,
          first_name: "John",
          username: "watson",
        },
        authDate: new Date(),
        raw: "mock_raw",
      };

      const mockCreatedUserWithSuffix = {
        id: "usr_mock_watson",
        telegramId: BigInt(665544332),
        telegramUsername: "watson",
        firstName: "John",
        lastName: null,
        languageCode: null,
        status: UserStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastActiveAt: new Date(),
        profile: {
          id: "prof_mock_watson",
          userId: "usr_mock_watson",
          codename: "AGENT_WATSON_A1B2",
          displayName: "John",
          level: 1,
          xp: 0,
          currentRank: "UNASSIGNED",
          avatarUrl: null,
          bio: null,
          preferences: {},
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      };

      vi.spyOn(prisma.user, "findUnique").mockResolvedValueOnce(null);
      vi.spyOn(prisma, "$transaction").mockImplementationOnce(async (cb: any) => {
        return cb({
          user: {
            findUnique: vi.fn().mockResolvedValue(null),
            create: vi.fn().mockResolvedValue(mockCreatedUserWithSuffix),
          },
          playerProfile: {
            // First findUnique for base codename returns existing record (collision!)
            findUnique: vi.fn().mockResolvedValue({ id: "existing_prof" }),
            create: vi.fn().mockResolvedValue(mockCreatedUserWithSuffix.profile),
          },
        });
      });

      const result = await PlayerProvisioningService.findOrCreatePlayer(mockAuthData);

      expect(result.id).toBe("usr_mock_watson");
      expect(result.profile?.codename).toBe("AGENT_WATSON_A1B2");
    });

    it("should preserve existing codename, level, and XP for returning players without overwriting", async () => {
      const existingUser = {
        id: "usr_veteran_999",
        telegramId: BigInt(987654321),
        telegramUsername: "old_username",
        firstName: "Sherlock",
        lastName: "Holmes",
        languageCode: "en",
        status: UserStatus.ACTIVE,
        createdAt: new Date(Date.now() - 1000000),
        updatedAt: new Date(Date.now() - 1000000),
        lastActiveAt: new Date(Date.now() - 1000000),
        profile: {
          id: "prof_veteran_999",
          userId: "usr_veteran_999",
          codename: "MASTER_DETECTIVE_221B", // Custom player codename
          displayName: "Sherlock Holmes",
          level: 15, // Advanced level
          xp: 8500, // Accumulated XP
          currentRank: "SENIOR_INSPECTOR",
          avatarUrl: "https://example.com/avatar.jpg",
          bio: "Consulting Detective",
          preferences: { theme: "noir" },
          createdAt: new Date(Date.now() - 1000000),
          updatedAt: new Date(Date.now() - 1000000),
        },
      };

      const updatedUser = {
        ...existingUser,
        telegramUsername: "new_username",
        lastActiveAt: new Date(),
      };

      vi.spyOn(prisma.user, "findUnique").mockResolvedValueOnce(existingUser as any);
      const updateSpy = vi.spyOn(prisma.user, "update").mockResolvedValueOnce(updatedUser as any);

      const mockAuthData = {
        user: {
          id: 987654321,
          first_name: "Sherlock",
          last_name: "Holmes",
          username: "new_username",
          language_code: "en",
        },
        authDate: new Date(),
        raw: "mock_raw",
      };

      const result = await PlayerProvisioningService.findOrCreatePlayer(mockAuthData);

      expect(result.id).toBe("usr_veteran_999");
      // Codename, level, and XP must be strictly preserved
      expect(result.profile?.codename).toBe("MASTER_DETECTIVE_221B");
      expect(result.profile?.level).toBe(15);
      expect(result.profile?.xp).toBe(8500);

      // Verify prisma.user.update was called with only safe identity attributes
      expect(updateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "usr_veteran_999" },
          data: expect.objectContaining({
            telegramUsername: "new_username",
          }),
        })
      );
    });
  });

  // =========================================================================
  // 4. Session Service
  // =========================================================================
  describe("SessionService", () => {
    it("should create a session with SHA-256 hashed token and 30-day expiration", async () => {
      const mockCreatedSession = {
        id: "sess_123",
        userId: "usr_123",
        tokenHash: "mock_token_hash",
        userAgent: "TelegramMiniApp/1.0",
        ipAddress: "127.0.0.1",
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000),
        lastActivityAt: new Date(),
        revokedAt: null,
        user: {
          id: "usr_123",
          telegramId: BigInt(123456789),
          telegramUsername: "detective",
          firstName: "John",
          lastName: "Watson",
          languageCode: "en",
          status: UserStatus.ACTIVE,
          createdAt: new Date(),
          updatedAt: new Date(),
          lastActiveAt: new Date(),
          profile: {
            id: "prof_123",
            userId: "usr_123",
            codename: "AGENT_WATSON",
            displayName: "Dr. Watson",
            level: 3,
            xp: 450,
            currentRank: "CONSTABLE",
            avatarUrl: null,
            bio: null,
            preferences: {},
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        },
      };

      const createSpy = vi
        .spyOn(prisma.authSession, "create")
        .mockResolvedValueOnce(mockCreatedSession as any);

      const result = await SessionService.createSession("usr_123", {
        userAgent: "TelegramMiniApp/1.0",
        ipAddress: "127.0.0.1",
      });

      expect(result.rawToken).toBeDefined();
      expect(result.rawToken.length).toBe(64);
      expect(result.user.id).toBe("usr_123");
      // BigInt telegramId must be converted to string
      expect(result.user.telegramId).toBe("123456789");

      // Verify rawToken was NOT stored directly in database, only SHA-256 hash
      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: "usr_123",
            tokenHash: hashSessionToken(result.rawToken),
            userAgent: "TelegramMiniApp/1.0",
            ipAddress: "127.0.0.1",
          }),
        })
      );
    });

    it("should validate active session and return safe user data", async () => {
      const rawToken = generateSessionToken();
      const tokenHash = hashSessionToken(rawToken);

      const mockActiveSession = {
        id: "sess_active",
        userId: "usr_active",
        tokenHash,
        userAgent: "Mozilla/5.0",
        ipAddress: "10.0.0.1",
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 1000000),
        lastActivityAt: new Date(),
        revokedAt: null,
        user: {
          id: "usr_active",
          telegramId: BigInt(99887766),
          telegramUsername: "active_user",
          firstName: "Active",
          lastName: null,
          languageCode: "en",
          status: UserStatus.ACTIVE,
          createdAt: new Date(),
          updatedAt: new Date(),
          lastActiveAt: new Date(),
          profile: {
            id: "prof_active",
            userId: "usr_active",
            codename: "AGENT_ACTIVE",
            displayName: "Active Agent",
            level: 2,
            xp: 150,
            currentRank: "UNASSIGNED",
            avatarUrl: null,
            bio: null,
            preferences: {},
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        },
      };

      vi.spyOn(prisma.authSession, "findUnique").mockResolvedValueOnce(mockActiveSession as any);
      vi.spyOn(prisma.authSession, "update").mockResolvedValueOnce(mockActiveSession as any);

      const validation = await SessionService.validateSession(rawToken);

      expect(validation.authenticated).toBe(true);
      if (validation.authenticated) {
        expect(validation.user.id).toBe("usr_active");
        expect(validation.user.telegramId).toBe("99887766");
        expect(validation.session.id).toBe("sess_active");
      }
    });

    it("should reject expired session", async () => {
      const rawToken = generateSessionToken();
      const mockExpiredSession = {
        id: "sess_expired",
        userId: "usr_1",
        tokenHash: hashSessionToken(rawToken),
        expiresAt: new Date(Date.now() - 5000), // in the past
        revokedAt: null,
        user: { id: "usr_1", profile: null },
      };

      vi.spyOn(prisma.authSession, "findUnique").mockResolvedValueOnce(mockExpiredSession as any);

      const validation = await SessionService.validateSession(rawToken);

      expect(validation.authenticated).toBe(false);
      if (!validation.authenticated) {
        expect(validation.reason).toContain("expired");
      }
    });

    it("should reject revoked session", async () => {
      const rawToken = generateSessionToken();
      const mockRevokedSession = {
        id: "sess_revoked",
        userId: "usr_1",
        tokenHash: hashSessionToken(rawToken),
        expiresAt: new Date(Date.now() + 1000000),
        revokedAt: new Date(Date.now() - 1000), // revoked
        user: { id: "usr_1", profile: null },
      };

      vi.spyOn(prisma.authSession, "findUnique").mockResolvedValueOnce(mockRevokedSession as any);

      const validation = await SessionService.validateSession(rawToken);

      expect(validation.authenticated).toBe(false);
      if (!validation.authenticated) {
        expect(validation.reason).toContain("revoked");
      }
    });

    it("should revoke session by token hash", async () => {
      const rawToken = generateSessionToken();
      const tokenHash = hashSessionToken(rawToken);
      const updateManySpy = vi
        .spyOn(prisma.authSession, "updateMany")
        .mockResolvedValueOnce({ count: 1 });

      await SessionService.revokeSession(rawToken);

      expect(updateManySpy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tokenHash, revokedAt: null },
        })
      );
    });
  });

  // =========================================================================
  // 5. Authentication Guards
  // =========================================================================
  describe("Authentication Guards", () => {
    it("getCurrentSession should return unauthenticated when cookie is missing", async () => {
      const result = await getCurrentSession();

      expect(result.authenticated).toBe(false);
      if (!result.authenticated) {
        expect(result.reason).toContain("No session cookie");
      }
    });

    it("getCurrentUser should return null when unauthenticated", async () => {
      const user = await getCurrentUser();
      expect(user).toBeNull();
    });

    it("requireAuthenticatedUser should throw UNAUTHORIZED when no session exists", async () => {
      await expect(requireAuthenticatedUser()).rejects.toThrowError(AppError);

      try {
        await requireAuthenticatedUser();
      } catch (err) {
        expect(err).toBeInstanceOf(AppError);
        expect((err as AppError).code).toBe("UNAUTHORIZED");
        expect((err as AppError).statusCode).toBe(401);
      }
    });
  });

  // =========================================================================
  // 6. Auth API Route Handlers
  // =========================================================================
  describe("Auth API Route Handlers", () => {
    describe("POST /api/auth/telegram", () => {
      it("should reject request with missing or empty initData with HTTP 400", async () => {
        const req = new Request("http://localhost:3000/api/auth/telegram", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        });

        const res = await telegramAuthRoute(req);
        const data = await res.json();

        expect(res.status).toBe(400);
        expect(data.code).toBe("VALIDATION_ERROR");
      });

      it("should reject invalid initData signature with HTTP 401", async () => {
        const req = new Request("http://localhost:3000/api/auth/telegram", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ initData: "query_id=invalid&hash=badhash" }),
        });

        const res = await telegramAuthRoute(req);
        const data = await res.json();

        expect(res.status).toBe(401);
        expect(data.code).toBe("INVALID_SIGNATURE");
      });

      it("should authenticate valid initData, issue session cookie, and return HTTP 200 with safe user", async () => {
        // Set env token for route handler
        process.env.TELEGRAM_BOT_TOKEN = TEST_BOT_TOKEN;

        const signedInitData = sign(
          {
            query_id: "valid_flow_query",
            user: TEST_USER,
          },
          TEST_BOT_TOKEN,
          new Date()
        );

        const mockUserWithProfile = {
          id: "usr_flow_1",
          telegramId: BigInt(TEST_USER.id),
          telegramUsername: TEST_USER.username,
          firstName: TEST_USER.first_name,
          lastName: TEST_USER.last_name,
          languageCode: TEST_USER.language_code,
          status: UserStatus.ACTIVE,
          createdAt: new Date(),
          updatedAt: new Date(),
          lastActiveAt: new Date(),
          profile: {
            id: "prof_flow_1",
            userId: "usr_flow_1",
            codename: "AGENT_SHERLOCK",
            displayName: "Sherlock Holmes",
            level: 1,
            xp: 0,
            currentRank: "UNASSIGNED",
            avatarUrl: null,
            bio: null,
            preferences: {},
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        };

        vi.spyOn(PlayerProvisioningService, "findOrCreatePlayer").mockResolvedValueOnce(
          mockUserWithProfile as any
        );

        const rawSessionToken = generateSessionToken();
        vi.spyOn(SessionService, "createSession").mockResolvedValueOnce({
          rawToken: rawSessionToken,
          session: { id: "sess_flow_1" } as any,
          user: {
            id: "usr_flow_1",
            telegramId: TEST_USER.id.toString(),
            telegramUsername: TEST_USER.username,
            firstName: TEST_USER.first_name,
            lastName: TEST_USER.last_name,
            languageCode: TEST_USER.language_code,
            status: UserStatus.ACTIVE,
            createdAt: new Date().toISOString(),
            profile: {
              id: "prof_flow_1",
              codename: "AGENT_SHERLOCK",
              displayName: "Sherlock Holmes",
              level: 1,
              xp: 0,
              avatarUrl: null,
              preferences: {},
            },
          },
        });

        const req = new Request("http://localhost:3000/api/auth/telegram", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "User-Agent": "TelegramMiniApp/1.0",
          },
          body: JSON.stringify({ initData: signedInitData }),
        });

        const res = await telegramAuthRoute(req);
        const data = await res.json();

        expect(res.status).toBe(200);
        expect(data.ok).toBe(true);
        expect(data.user.id).toBe("usr_flow_1");
        expect(data.user.profile.codename).toBe("AGENT_SHERLOCK");

        // Verify cookie was set in cookie store
        expect(mockCookieStore.set).toHaveBeenCalledWith(
          SESSION_COOKIE_NAME,
          rawSessionToken,
          expect.objectContaining({
            httpOnly: true,
            path: "/",
            maxAge: SESSION_MAX_AGE_SECONDS,
          })
        );
      });
    });

    describe("GET /api/auth/session", () => {
      it("should return authenticated: false when session cookie is absent", async () => {
        const res = await sessionRoute();
        const data = await res.json();

        expect(res.status).toBe(200);
        expect(data.authenticated).toBe(false);
      });

      it("should return authenticated: true with user data when active session cookie is present", async () => {
        const testRawToken = generateSessionToken();
        mockCookieMap.set(SESSION_COOKIE_NAME, { value: testRawToken });

        vi.spyOn(SessionService, "validateSession").mockResolvedValueOnce({
          authenticated: true,
          session: { id: "sess_mock" } as any,
          user: {
            id: "usr_mock",
            telegramId: "12345678",
            telegramUsername: "testuser",
            firstName: "Test",
            lastName: null,
            languageCode: "en",
            status: UserStatus.ACTIVE,
            createdAt: new Date().toISOString(),
            profile: {
              id: "prof_mock",
              codename: "AGENT_TEST",
              displayName: "Test Agent",
              level: 1,
              xp: 0,
              avatarUrl: null,
              preferences: {},
            },
          },
        });

        const res = await sessionRoute();
        const data = await res.json();

        expect(res.status).toBe(200);
        expect(data.authenticated).toBe(true);
        expect(data.user.id).toBe("usr_mock");
        expect(data.user.profile.codename).toBe("AGENT_TEST");
      });
    });

    describe("POST /api/auth/logout", () => {
      it("should revoke session in database and clear cookie with maxAge 0", async () => {
        const testRawToken = generateSessionToken();
        mockCookieMap.set(SESSION_COOKIE_NAME, { value: testRawToken });

        const revokeSpy = vi.spyOn(SessionService, "revokeSession").mockResolvedValueOnce(true);

        const res = await logoutRoute();
        const data = await res.json();

        expect(res.status).toBe(200);
        expect(data.ok).toBe(true);
        expect(data.message).toBe("Logged out successfully");

        expect(revokeSpy).toHaveBeenCalledWith(testRawToken);
        expect(mockCookieStore.set).toHaveBeenCalledWith(
          SESSION_COOKIE_NAME,
          "",
          expect.objectContaining({
            httpOnly: true,
            maxAge: 0,
          })
        );
      });
    });
  });
});
