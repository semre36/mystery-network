import { describe, it, expect, vi, beforeEach } from "vitest";
import { PlayerService } from "@/modules/players/services/player.service";
import { getRankForLevel, INVESTIGATOR_RANKS } from "@/modules/players/utils/rank.util";
import { updateProfileSchema } from "@/modules/players/validation/player.schema";
import { GET as getPlayerMeRoute } from "@/app/api/player/me/route";
import { PATCH as updateProfileRoute } from "@/app/api/player/profile/route";
import * as authGuard from "@/modules/authentication/guards/auth.guard";
import { prisma } from "@/server/infrastructure/database";
import { AppError } from "@/lib/errors/app-error";
import { UserStatus } from "@prisma/client";

describe("Player Interface & Investigator Dossier (Phase 05)", () => {
  const MOCK_USER_ID = "00000000-0000-4000-a000-000000000001";
  const MOCK_PROFILE_ID = "00000000-0000-4000-a000-000000000002";
  const NON_EXISTENT_USER_ID = "00000000-0000-4000-a000-999999999999";

  const mockSafeUser = {
    id: MOCK_USER_ID,
    telegramId: "987654321",
    telegramUsername: "test_investigator",
    firstName: "Sherlock",
    lastName: "Holmes",
    languageCode: "en",
    status: UserStatus.ACTIVE,
    createdAt: new Date("2026-01-01T00:00:00.000Z").toISOString(),
    profile: {
      id: MOCK_PROFILE_ID,
      codename: "AGENT_SHERLOCK",
      displayName: "Sherlock Holmes",
      avatarUrl: null,
      xp: 450,
      level: 3,
      preferences: { specialization: "Forensic Analysis", theme: "navy" },
    },
  };

  const mockDbUser = {
    id: MOCK_USER_ID,
    telegramId: BigInt(987654321),
    telegramUsername: "test_investigator",
    firstName: "Sherlock",
    lastName: "Holmes",
    languageCode: "en",
    status: UserStatus.ACTIVE,
    lastActiveAt: new Date("2026-11-06T08:30:00.000Z"),
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-11-06T08:30:00.000Z"),
    profile: {
      id: MOCK_PROFILE_ID,
      userId: MOCK_USER_ID,
      codename: "AGENT_SHERLOCK",
      displayName: "Sherlock Holmes",
      avatarUrl: null,
      xp: 450,
      level: 3,
      preferences: { specialization: "Forensic Analysis", theme: "navy" },
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-11-06T08:30:00.000Z"),
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =========================================================================
  // 1. Rank Derivation Utilities
  // =========================================================================
  describe("Rank Classification & Derivation", () => {
    it("should classify Level 1 and 2 as Junior Operative (OP-1)", () => {
      const rankL1 = getRankForLevel(1);
      const rankL2 = getRankForLevel(2);

      expect(rankL1.badge).toBe("OP-1");
      expect(rankL1.title).toBe("Junior Operative");
      expect(rankL2.badge).toBe("OP-1");
    });

    it("should classify Level 3 through 6 as Field Investigator (INV-2)", () => {
      const rankL3 = getRankForLevel(3);
      const rankL6 = getRankForLevel(6);

      expect(rankL3.badge).toBe("INV-2");
      expect(rankL3.title).toBe("Field Investigator");
      expect(rankL6.badge).toBe("INV-2");
    });

    it("should classify Level 7 through 11 as Senior Detective (DET-3)", () => {
      const rankL7 = getRankForLevel(7);
      const rankL11 = getRankForLevel(11);

      expect(rankL7.badge).toBe("DET-3");
      expect(rankL7.title).toBe("Senior Detective");
      expect(rankL11.badge).toBe("DET-3");
    });

    it("should classify Level 12 through 19 as Lead Inspector (INSP-4)", () => {
      const rankL12 = getRankForLevel(12);
      expect(rankL12.badge).toBe("INSP-4");
      expect(rankL12.title).toBe("Lead Inspector");
    });

    it("should classify Level 20+ as Master Sleuth (MST-5)", () => {
      const rankL20 = getRankForLevel(20);
      const rankL50 = getRankForLevel(50);

      expect(rankL20.badge).toBe("MST-5");
      expect(rankL20.title).toBe("Master Sleuth");
      expect(rankL50.badge).toBe("MST-5");
    });

    it("should clamp non-positive or 0 levels safely to Level 1 rank", () => {
      const rankZero = getRankForLevel(0);
      const rankNeg = getRankForLevel(-5);

      expect(rankZero.badge).toBe("OP-1");
      expect(rankNeg.badge).toBe("OP-1");
    });
  });

  // =========================================================================
  // 2. Profile Validation Schema
  // =========================================================================
  describe("updateProfileSchema", () => {
    it("should accept valid profile updates", () => {
      const valid = updateProfileSchema.safeParse({
        codename: "agent_watson",
        displayName: "Dr. John Watson",
        specialization: "Forensic Analysis",
        theme: "noir",
        languageCode: "en",
      });

      expect(valid.success).toBe(true);
      if (valid.success) {
        // Automatically uppercases codename
        expect(valid.data.codename).toBe("AGENT_WATSON");
        expect(valid.data.displayName).toBe("Dr. John Watson");
      }
    });

    it("should reject codenames containing illegal characters or spaces", () => {
      const invalidChars = updateProfileSchema.safeParse({
        codename: "AGENT$WATSON",
      });
      const withSpaces = updateProfileSchema.safeParse({
        codename: "AGENT WATSON",
      });

      expect(invalidChars.success).toBe(false);
      expect(withSpaces.success).toBe(false);
    });

    it("should reject codenames shorter than 3 or longer than 30 characters", () => {
      const tooShort = updateProfileSchema.safeParse({ codename: "AG" });
      const tooLong = updateProfileSchema.safeParse({
        codename: "A".repeat(31),
      });

      expect(tooShort.success).toBe(false);
      expect(tooLong.success).toBe(false);
    });

    it("should reject modifications of protected fields (xp, level, rank, role, status)", () => {
      const forbiddenPayload = {
        displayName: "Hacker",
        xp: 999999, // Protected
        level: 99, // Protected
      };

      const result = updateProfileSchema.safeParse(forbiddenPayload);
      expect(result.success).toBe(false);
    });
  });

  // =========================================================================
  // 3. PlayerService (Dossier & Dashboard Queries)
  // =========================================================================
  describe("PlayerService", () => {
    it("getDossier should return complete typed player dossier", async () => {
      vi.spyOn(prisma.user, "findUnique").mockResolvedValueOnce(mockDbUser as any);

      const dossier = await PlayerService.getDossier(MOCK_USER_ID);

      expect(dossier).toBeDefined();
      expect(dossier.id).toBe(MOCK_PROFILE_ID);
      expect(dossier.userId).toBe(MOCK_USER_ID);
      expect(dossier.codename).toBe("AGENT_SHERLOCK");
      expect(dossier.displayName).toBe("Sherlock Holmes");
      expect(dossier.level).toBe(3);
      expect(dossier.xp).toBe(450);
      expect(dossier.rank.badge).toBe("INV-2");
      expect(dossier.specialization).toBe("Forensic Analysis");
      expect(dossier.preferences.theme).toBe("navy");
    });

    it("getDossier should throw 404 AppError if user or profile is not found", async () => {
      vi.spyOn(prisma.user, "findUnique").mockResolvedValueOnce(null);

      try {
        await PlayerService.getDossier(NON_EXISTENT_USER_ID);
        expect.unreachable("Expected PlayerService.getDossier to throw");
      } catch (err) {
        expect(err).toBeInstanceOf(AppError);
        expect((err as AppError).statusCode).toBe(404);
        expect((err as AppError).code).toBe("PLAYER_NOT_FOUND");
      }
    });

    it("getDashboardData should return real statistics, achievements, and truthful activity", async () => {
      vi.spyOn(prisma.user, "findUnique").mockResolvedValueOnce(mockDbUser as any);
      vi.spyOn(prisma.investigationParticipant, "count")
        .mockResolvedValueOnce(2) // active
        .mockResolvedValueOnce(5); // completed
      vi.spyOn(prisma.clueAssignment, "count").mockResolvedValueOnce(12);

      const mockAchievements = [
        {
          id: "ua_1",
          unlockedAt: new Date("2026-05-01T12:00:00Z"),
          achievement: {
            id: "ach_1",
            code: "FIRST_CASE",
            title: "First Clue Found",
            description: "Uncovered your first critical piece of evidence.",
            category: "EVIDENCE",
            iconUrl: null,
          },
        },
      ];
      vi.spyOn(prisma.userAchievement, "findMany").mockResolvedValueOnce(mockAchievements as any);

      const data = await PlayerService.getDashboardData(MOCK_USER_ID);

      expect(data).toBeDefined();
      expect(data.dossier.codename).toBe("AGENT_SHERLOCK");
      expect(data.stats.activeInvestigations).toBe(2);
      expect(data.stats.completedInvestigations).toBe(5);
      expect(data.stats.totalCluesCollected).toBe(12);
      expect(data.stats.unlockedAchievementsCount).toBe(1);
      expect(data.achievements.length).toBe(1);
      expect(data.achievements[0].title).toBe("First Clue Found");
      expect(data.recentActivity.length).toBeGreaterThan(0);
    });

    it("getDashboardData should honestly reflect empty states when player has zero investigations and achievements", async () => {
      vi.spyOn(prisma.user, "findUnique").mockResolvedValueOnce(mockDbUser as any);
      vi.spyOn(prisma.investigationParticipant, "count")
        .mockResolvedValueOnce(0) // active
        .mockResolvedValueOnce(0); // completed
      vi.spyOn(prisma.clueAssignment, "count").mockResolvedValueOnce(0);
      vi.spyOn(prisma.userAchievement, "findMany").mockResolvedValueOnce([]);

      const data = await PlayerService.getDashboardData(MOCK_USER_ID);

      expect(data.stats.activeInvestigations).toBe(0);
      expect(data.stats.completedInvestigations).toBe(0);
      expect(data.stats.totalCluesCollected).toBe(0);
      expect(data.stats.unlockedAchievementsCount).toBe(0);
      expect(data.achievements).toEqual([]);
    });

    it("updateProfile should successfully update codename, displayName, and preferences", async () => {
      vi.spyOn(prisma.user, "findUnique").mockResolvedValueOnce(mockDbUser as any);
      vi.spyOn(prisma.playerProfile, "findUnique").mockResolvedValueOnce(null); // No collision

      const updatedUser = { ...mockDbUser, languageCode: "es" };
      const updatedProfile = {
        ...mockDbUser.profile,
        codename: "AGENT_MYSTERY",
        displayName: "Mystery Inspector",
        preferences: { specialization: "Cipher & Cryptography", theme: "noir" },
      };

      vi.spyOn(prisma, "$transaction").mockResolvedValueOnce([updatedUser, updatedProfile] as any);

      const result = await PlayerService.updateProfile(MOCK_USER_ID, {
        codename: "AGENT_MYSTERY",
        displayName: "Mystery Inspector",
        specialization: "Cipher & Cryptography",
        theme: "noir",
        languageCode: "es",
      });

      expect(result.codename).toBe("AGENT_MYSTERY");
      expect(result.displayName).toBe("Mystery Inspector");
      expect(result.specialization).toBe("Cipher & Cryptography");
      expect(result.preferences.theme).toBe("noir");
    });

    it("updateProfile should reject codename change if already claimed by another operative with 409 CODENAME_TAKEN", async () => {
      vi.spyOn(prisma.user, "findUnique").mockResolvedValueOnce(mockDbUser as any);
      vi.spyOn(prisma.playerProfile, "findUnique").mockResolvedValueOnce({
        id: "prof_different_operative_999",
        codename: "TAKEN_CALLSIGN",
      } as any);

      try {
        await PlayerService.updateProfile(MOCK_USER_ID, {
          codename: "TAKEN_CALLSIGN",
        });
        expect.unreachable("Expected PlayerService.updateProfile to throw");
      } catch (err) {
        expect(err).toBeInstanceOf(AppError);
        expect((err as AppError).statusCode).toBe(409);
        expect((err as AppError).code).toBe("CODENAME_TAKEN");
      }
    });
  });

  // =========================================================================
  // 4. Player API Routes
  // =========================================================================
  describe("Player API Route Handlers", () => {
    describe("GET /api/player/me", () => {
      it("should reject unauthenticated requests with HTTP 401", async () => {
        vi.spyOn(authGuard, "requireAuthenticatedUser").mockRejectedValueOnce(
          new AppError("Authentication required to access this resource", 401, "UNAUTHORIZED")
        );

        const res = await getPlayerMeRoute();
        const data = await res.json();

        expect(res.status).toBe(401);
        expect(data.code).toBe("UNAUTHORIZED");
      });

      it("should return HTTP 200 with dashboard data for authenticated user", async () => {
        vi.spyOn(authGuard, "requireAuthenticatedUser").mockResolvedValueOnce(mockSafeUser as any);
        vi.spyOn(PlayerService, "getDashboardData").mockResolvedValueOnce({
          dossier: {
            id: MOCK_PROFILE_ID,
            userId: MOCK_USER_ID,
            codename: "AGENT_SHERLOCK",
            displayName: "Sherlock Holmes",
            avatarUrl: null,
            xp: 450,
            level: 3,
            rank: INVESTIGATOR_RANKS[1],
            specialization: "Forensic Analysis",
            preferences: { theme: "navy" },
            joinedAt: new Date().toISOString(),
            lastActiveAt: new Date().toISOString(),
            status: UserStatus.ACTIVE,
            telegramUsername: "test_investigator",
          },
          stats: {
            activeInvestigations: 1,
            completedInvestigations: 3,
            totalCluesCollected: 8,
            unlockedAchievementsCount: 2,
          },
          achievements: [],
          recentActivity: [],
        });

        const res = await getPlayerMeRoute();
        const data = await res.json();

        expect(res.status).toBe(200);
        expect(data.ok).toBe(true);
        expect(data.data.dossier.codename).toBe("AGENT_SHERLOCK");
        expect(data.data.stats.activeInvestigations).toBe(1);
      });
    });

    describe("PATCH /api/player/profile", () => {
      it("should reject unauthenticated profile updates with HTTP 401", async () => {
        vi.spyOn(authGuard, "requireAuthenticatedUser").mockRejectedValueOnce(
          new AppError("Authentication required to access this resource", 401, "UNAUTHORIZED")
        );

        const req = new Request("http://localhost:3000/api/player/profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ displayName: "Test Name" }),
        });

        const res = await updateProfileRoute(req);
        const data = await res.json();

        expect(res.status).toBe(401);
        expect(data.code).toBe("UNAUTHORIZED");
      });

      it("should reject malformed JSON with HTTP 400", async () => {
        vi.spyOn(authGuard, "requireAuthenticatedUser").mockResolvedValueOnce(mockSafeUser as any);

        const req = new Request("http://localhost:3000/api/player/profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: "{bad json",
        });

        const res = await updateProfileRoute(req);
        const data = await res.json();

        expect(res.status).toBe(400);
        expect(data.code).toBe("MALFORMED_JSON");
      });

      it("should reject validation errors (e.g. invalid codename) with HTTP 400", async () => {
        vi.spyOn(authGuard, "requireAuthenticatedUser").mockResolvedValueOnce(mockSafeUser as any);

        const req = new Request("http://localhost:3000/api/player/profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ codename: "NO" }), // Less than 3 chars
        });

        const res = await updateProfileRoute(req);
        const data = await res.json();

        expect(res.status).toBe(400);
        expect(data.code).toBe("VALIDATION_ERROR");
      });

      it("should reject modification of protected progression fields (e.g. xp, level) with HTTP 400", async () => {
        vi.spyOn(authGuard, "requireAuthenticatedUser").mockResolvedValueOnce(mockSafeUser as any);

        const req = new Request("http://localhost:3000/api/player/profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ displayName: "New Name", xp: 99999 }),
        });

        const res = await updateProfileRoute(req);
        const data = await res.json();

        expect(res.status).toBe(400);
        expect(data.code).toBe("VALIDATION_ERROR");
      });

      it("should update valid profile fields and return HTTP 200 with updated dossier", async () => {
        vi.spyOn(authGuard, "requireAuthenticatedUser").mockResolvedValueOnce(mockSafeUser as any);
        vi.spyOn(PlayerService, "updateProfile").mockResolvedValueOnce({
          id: MOCK_PROFILE_ID,
          userId: MOCK_USER_ID,
          codename: "AGENT_UPDATED",
          displayName: "Sherlock Holmes Updated",
          avatarUrl: null,
          xp: 450,
          level: 3,
          rank: INVESTIGATOR_RANKS[1],
          specialization: "Forensic Analysis",
          preferences: { theme: "noir" },
          joinedAt: new Date().toISOString(),
          lastActiveAt: new Date().toISOString(),
          status: UserStatus.ACTIVE,
          telegramUsername: "test_investigator",
        });

        const req = new Request("http://localhost:3000/api/player/profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            codename: "AGENT_UPDATED",
            displayName: "Sherlock Holmes Updated",
            theme: "noir",
          }),
        });

        const res = await updateProfileRoute(req);
        const data = await res.json();

        expect(res.status).toBe(200);
        expect(data.ok).toBe(true);
        expect(data.dossier.codename).toBe("AGENT_UPDATED");
        expect(data.dossier.displayName).toBe("Sherlock Holmes Updated");
      });
    });
  });
});
