import { describe, it, expect, vi, beforeEach } from "vitest";
import { AdminGuard } from "@/modules/administration/guards/admin.guard";
import { AdminUsersService } from "@/modules/administration/services/admin-users.service";
import { AdminRolesService } from "@/modules/administration/services/admin-roles.service";
import { AdminContentService } from "@/modules/administration/services/admin-content.service";
import { AdminRewardsService } from "@/modules/administration/services/admin-rewards.service";
import { AdminAuditService } from "@/modules/administration/services/audit.service";
import { AdminBootstrapService } from "@/modules/administration/services/bootstrap.service";
import { SessionService } from "@/modules/authentication/services/session.service";
import {
  DEFAULT_ADMIN_ROLES,
  ADMIN_PERMISSIONS,
} from "@/modules/administration/constants/admin-permissions";
import * as authGuard from "@/modules/authentication/guards/auth.guard";
import { prisma } from "@/server/infrastructure/database";
import { AppError } from "@/lib/errors/app-error";
import { UserStatus, ContentStatus, CaseDifficulty, PuzzleType } from "@prisma/client";
import { NextRequest } from "next/server";
import { GET as getCaseByIdRoute } from "@/app/api/admin/cases/[caseId]/route";
import {
  GET as getSolutionRoute,
  PUT as putSolutionRoute,
} from "@/app/api/admin/cases/[caseId]/solution/route";
import { POST as bootstrapRoute } from "@/app/api/admin/bootstrap/route";

vi.mock("next/headers", () => ({
  cookies: vi.fn().mockImplementation(async () => ({
    get: vi.fn((name: string) => ({ value: "mock_test_session_token" })),
    set: vi.fn(),
    delete: vi.fn(),
  })),
}));

describe("Admin Dashboard & Content Management System (Phase 13)", () => {
  const MOCK_SUPER_ADMIN_ID = "00000000-0000-4000-a000-000000000001";
  const MOCK_CASE_AUTHOR_ID = "00000000-0000-4000-a000-000000000002";
  const MOCK_MODERATOR_ID = "00000000-0000-4000-a000-000000000003";
  const MOCK_PLAYER_ID = "00000000-0000-4000-a000-000000000004";
  const MOCK_ROLE_SUPER_ID = "00000000-0000-4000-b000-000000000001";
  const MOCK_ROLE_AUTHOR_ID = "00000000-0000-4000-b000-000000000002";
  const MOCK_CASE_ID = "00000000-0000-4000-c000-000000000001";
  const MOCK_PUZZLE_ID = "00000000-0000-4000-d000-000000000001";

  beforeEach(() => {
    vi.restoreAllMocks();
    (prisma as any).$executeRaw = vi.fn().mockResolvedValue(1);
  });

  // ============================================================================
  // 1. CLEARANCE & RBAC GUARDS
  // ============================================================================
  describe("1. Administrative Clearance & Granular RBAC Guards", () => {
    it("should reject unauthenticated requests with HTTP 401", async () => {
      vi.spyOn(authGuard, "requireAuthenticatedUser").mockRejectedValue(
        new AppError("Authentication required", 401, "UNAUTHORIZED")
      );

      await expect(AdminGuard.requireAdmin()).rejects.toThrow("Authentication required");
    });

    it("should reject normal players without administrative roles with HTTP 403 ADMIN_CLEARANCE_REQUIRED", async () => {
      vi.spyOn(authGuard, "requireAuthenticatedUser").mockResolvedValue({
        id: MOCK_PLAYER_ID,
        telegramId: "999999",
      } as any);

      vi.spyOn(prisma.user, "findUnique").mockResolvedValue({
        id: MOCK_PLAYER_ID,
        telegramId: BigInt(999999),
        status: UserStatus.ACTIVE,
        adminRoles: [], // No roles assigned
        profile: { codename: "RookieDet" },
      } as any);

      await expect(AdminGuard.requireAdmin()).rejects.toThrow(
        "Access denied: Operational administrator clearance required"
      );
    });

    it("should reject suspended or banned administrators with HTTP 403 ACCOUNT_INACTIVE", async () => {
      vi.spyOn(authGuard, "requireAuthenticatedUser").mockResolvedValue({
        id: MOCK_SUPER_ADMIN_ID,
        telegramId: "111111",
      } as any);

      vi.spyOn(prisma.user, "findUnique").mockResolvedValue({
        id: MOCK_SUPER_ADMIN_ID,
        telegramId: BigInt(111111),
        status: UserStatus.SUSPENDED,
        adminRoles: [{ role: { name: DEFAULT_ADMIN_ROLES.SUPER_ADMIN, permissions: [] } }],
      } as any);

      await expect(AdminGuard.requireAdmin()).rejects.toThrow(
        "Administrator access denied: Account status is SUSPENDED"
      );
    });

    it("should allow SUPER_ADMIN to pass any specific permission check automatically", async () => {
      vi.spyOn(prisma.user, "findUnique").mockResolvedValue({
        id: MOCK_SUPER_ADMIN_ID,
        telegramId: BigInt(111111),
        status: UserStatus.ACTIVE,
        adminRoles: [
          {
            role: {
              name: DEFAULT_ADMIN_ROLES.SUPER_ADMIN,
              permissions: [{ permission: { action: ADMIN_PERMISSIONS.DASHBOARD_VIEW } }],
            },
          },
        ],
        profile: { codename: "ChiefDirector" },
      } as any);

      const ctx = await AdminGuard.requirePermission(
        ADMIN_PERMISSIONS.SYSTEM_SETTINGS_MANAGE,
        MOCK_SUPER_ADMIN_ID
      );
      expect(ctx.isSuperAdmin).toBe(true);
      expect(ctx.userId).toBe(MOCK_SUPER_ADMIN_ID);
    });

    it("should deny access when administrator lacks the required specific permission", async () => {
      vi.spyOn(prisma.user, "findUnique").mockResolvedValue({
        id: MOCK_CASE_AUTHOR_ID,
        telegramId: BigInt(222222),
        status: UserStatus.ACTIVE,
        adminRoles: [
          {
            role: {
              name: DEFAULT_ADMIN_ROLES.CASE_AUTHOR,
              permissions: [{ permission: { action: ADMIN_PERMISSIONS.CASE_VIEW } }],
            },
          },
        ],
        profile: { codename: "StoryArchitect" },
      } as any);

      await expect(
        AdminGuard.requirePermission(ADMIN_PERMISSIONS.USER_BAN, MOCK_CASE_AUTHOR_ID)
      ).rejects.toThrow("Privilege violation: Missing required permission 'USER_BAN'");
    });
  });

  // ============================================================================
  // 2. REQUIREMENT 3: SEPARATION OF CASE_UPDATE VS CASE_MANAGE_SOLUTION
  // ============================================================================
  describe("2. Requirement 3: Solution Matrix & Secret Answer Protection", () => {
    it("should reject CASE_UPDATE holder from accessing solutionConfig without CASE_MANAGE_SOLUTION", async () => {
      vi.spyOn(prisma.user, "findUnique").mockResolvedValue({
        id: MOCK_CASE_AUTHOR_ID,
        telegramId: BigInt(222222),
        status: UserStatus.ACTIVE,
        adminRoles: [
          {
            role: {
              name: DEFAULT_ADMIN_ROLES.CASE_AUTHOR,
              permissions: [{ permission: { action: ADMIN_PERMISSIONS.CASE_UPDATE } }],
            },
          },
        ],
      } as any);

      // Attempt to update solutionConfig
      await expect(
        AdminContentService.updateCaseSolutionConfig(MOCK_CASE_AUTHOR_ID, MOCK_CASE_ID, {
          primaryCharacterId: "00000000-0000-4000-a000-000000000099",
          motiveKeywords: ["blackmail"],
          methodKeywords: ["cyanide"],
        } as any)
      ).rejects.toThrow("Privilege violation: Missing required permission 'CASE_MANAGE_SOLUTION'");
    });

    it("should strip solutionConfig when an administrator without CASE_MANAGE_SOLUTION inspects case details", async () => {
      const mockRawCase = {
        id: MOCK_CASE_ID,
        caseCode: "CASE-001",
        title: "The Midnight Protocol",
        status: ContentStatus.PUBLISHED,
        solutionConfig: {
          primaryCharacterId: "char_culprit_1",
          motiveKeywords: ["espionage"],
          explanation: "High security breach",
        },
        chapters: [],
        characters: [],
        clues: [],
        puzzles: [],
        _count: { investigations: 5 },
      };

      vi.spyOn(prisma.case, "findUnique").mockResolvedValue(mockRawCase as any);

      // Fetch with includeSecretSolution = false
      const safeCase = await AdminContentService.getCaseDetail(MOCK_CASE_ID, false);
      expect((safeCase as any).solutionConfig).toBeUndefined();
      expect(safeCase.title).toBe("The Midnight Protocol");

      // Fetch with includeSecretSolution = true
      const fullCase = await AdminContentService.getCaseDetail(MOCK_CASE_ID, true);
      expect((fullCase as any).solutionConfig).toBeDefined();
      expect((fullCase as any).solutionConfig.primaryCharacterId).toBe("char_culprit_1");
    });

    it("should prevent updating puzzle solutions without PUZZLE_MANAGE_SECRET clearance", async () => {
      vi.spyOn(prisma.user, "findUnique").mockResolvedValue({
        id: MOCK_CASE_AUTHOR_ID,
        telegramId: BigInt(222222),
        status: UserStatus.ACTIVE,
        adminRoles: [
          {
            role: {
              name: DEFAULT_ADMIN_ROLES.CASE_AUTHOR,
              permissions: [{ permission: { action: ADMIN_PERMISSIONS.PUZZLE_UPDATE } }],
            },
          },
        ],
      } as any);

      await expect(
        AdminContentService.updatePuzzle(MOCK_CASE_AUTHOR_ID, MOCK_PUZZLE_ID, {
          rawSolution: "CYBER_OVERRIDE_KEY",
        })
      ).rejects.toThrow("Privilege violation: Missing required permission 'PUZZLE_MANAGE_SECRET'");
    });
  });

  // ============================================================================
  // 3. REQUIREMENT 5: PUBLICATION VALIDATION
  // ============================================================================
  describe("3. Requirement 5: Actionable Case Publication Validation", () => {
    it("should return actionable error list when validating an incomplete case", async () => {
      vi.spyOn(prisma.case, "findUnique").mockResolvedValue({
        id: MOCK_CASE_ID,
        campaignId: null,
        chapters: [], // Empty chapters
        characters: [], // Empty characters
        clues: [], // Empty clues
        puzzles: [],
        solutionConfig: null, // Missing solution configuration
      } as any);

      const errors = await AdminContentService.validateCaseForPublication(MOCK_CASE_ID);

      expect(errors.length).toBeGreaterThanOrEqual(4);
      expect(errors).toContain("Case must define at least one chapter/act before publication.");
      expect(errors).toContain("Case must define at least one character / suspect of interest.");
      expect(errors).toContain("Case must define at least one forensic evidence item (clue).");
      expect(errors).toContain(
        "Case is missing evaluation configuration (solutionConfig). Define the culprit and evaluation criteria."
      );
    });

    it("should abort case publication with HTTP 422 PUBLICATION_VALIDATION_FAILED if requirements are unmet", async () => {
      vi.spyOn(prisma.case, "findUnique")
        .mockResolvedValueOnce({
          id: MOCK_CASE_ID,
          caseCode: "CASE-TEST",
          status: ContentStatus.DRAFT,
        } as any)
        .mockResolvedValueOnce({
          id: MOCK_CASE_ID,
          campaignId: null,
          chapters: [],
          characters: [],
          clues: [],
          puzzles: [],
          solutionConfig: null,
        } as any);

      await expect(
        AdminContentService.updateCase(MOCK_SUPER_ADMIN_ID, MOCK_CASE_ID, {
          status: ContentStatus.PUBLISHED,
        })
      ).rejects.toThrow("Case publication validation failed");
    });
  });

  // ============================================================================
  // 4. REQUIREMENT 6: PRIVILEGE ESCALATION PREVENTION
  // ============================================================================
  describe("4. Requirement 6: Privilege Escalation Protection in Role Management", () => {
    it("should prevent non-SUPER_ADMIN from appointing someone to SUPER_ADMIN", async () => {
      // Mock actor as MODERATOR
      vi.spyOn(prisma.user, "findUnique").mockResolvedValue({
        id: MOCK_MODERATOR_ID,
        telegramId: BigInt(333333),
        status: UserStatus.ACTIVE,
        adminRoles: [
          {
            role: {
              name: DEFAULT_ADMIN_ROLES.MODERATOR,
              permissions: [{ permission: { action: ADMIN_PERMISSIONS.ROLE_ASSIGN } }],
            },
          },
        ],
      } as any);

      vi.spyOn(prisma.adminRole, "findUnique").mockResolvedValue({
        id: MOCK_ROLE_SUPER_ID,
        name: DEFAULT_ADMIN_ROLES.SUPER_ADMIN,
        permissions: [],
      } as any);

      await expect(
        AdminRolesService.assignRoleToUser(MOCK_MODERATOR_ID, MOCK_PLAYER_ID, MOCK_ROLE_SUPER_ID)
      ).rejects.toThrow(
        "Privilege escalation denied: Only a Super Administrator can assign the SUPER_ADMIN role"
      );
    });

    it("should prevent an administrator from assigning a role with permissions they do not possess", async () => {
      // Actor only has USER_VIEW
      vi.spyOn(prisma.user, "findUnique")
        .mockResolvedValueOnce({
          id: MOCK_MODERATOR_ID,
          telegramId: BigInt(333333),
          status: UserStatus.ACTIVE,
          adminRoles: [
            {
              role: {
                name: "ASSISTANT_MOD",
                permissions: [{ permission: { action: ADMIN_PERMISSIONS.USER_VIEW } }],
              },
            },
          ],
        } as any)
        .mockResolvedValueOnce({
          id: MOCK_PLAYER_ID,
          profile: { codename: "TargetUser" },
        } as any);

      // Target role has USER_BAN (which actor lacks)
      vi.spyOn(prisma.adminRole, "findUnique").mockResolvedValue({
        id: "role_senior_mod",
        name: "SENIOR_MOD",
        permissions: [{ permission: { action: ADMIN_PERMISSIONS.USER_BAN } }],
      } as any);

      await expect(
        AdminRolesService.assignRoleToUser(MOCK_MODERATOR_ID, MOCK_PLAYER_ID, "role_senior_mod")
      ).rejects.toThrow(
        "Privilege escalation denied: You cannot assign a role granting permissions you do not possess"
      );
    });
  });

  // ============================================================================
  // 5. REQUIREMENT 2: LAST ACTIVE SUPER_ADMIN PROTECTION
  // ============================================================================
  describe("5. Requirement 2: Protection of Last Active SUPER_ADMIN", () => {
    it("should block revoking SUPER_ADMIN role when only one active super admin remains", async () => {
      vi.spyOn(prisma.adminRole, "findUnique").mockResolvedValue({
        id: MOCK_ROLE_SUPER_ID,
        name: DEFAULT_ADMIN_ROLES.SUPER_ADMIN,
      } as any);

      vi.spyOn(prisma.adminUserRole, "findUnique").mockResolvedValue({
        userId: MOCK_SUPER_ADMIN_ID,
        roleId: MOCK_ROLE_SUPER_ID,
      } as any);

      // Exactly 1 active super admin in database
      vi.spyOn(prisma.adminUserRole, "count").mockResolvedValue(1);

      await expect(AdminGuard.assertNotDemotingLastSuperAdmin(MOCK_SUPER_ADMIN_ID)).rejects.toThrow(
        "Critical protection: Cannot demote, suspend, or revoke the last remaining active SUPER_ADMIN"
      );
    });

    it("should block suspending or banning the last active super admin", async () => {
      vi.spyOn(prisma.adminRole, "findUnique").mockResolvedValue({
        id: MOCK_ROLE_SUPER_ID,
        name: DEFAULT_ADMIN_ROLES.SUPER_ADMIN,
      } as any);

      vi.spyOn(prisma.adminUserRole, "findUnique").mockResolvedValue({
        userId: MOCK_SUPER_ADMIN_ID,
        roleId: MOCK_ROLE_SUPER_ID,
      } as any);

      vi.spyOn(prisma.adminUserRole, "count").mockResolvedValue(1);

      // Mock $transaction to execute callback immediately
      vi.spyOn(prisma, "$transaction").mockImplementation(async (cb: any) => cb(prisma));

      await expect(
        AdminUsersService.suspendUser(MOCK_SUPER_ADMIN_ID, MOCK_SUPER_ADMIN_ID, "Self-lockout test")
      ).rejects.toThrow(
        "Critical protection: Cannot demote, suspend, or revoke the last remaining active SUPER_ADMIN"
      );

      await expect(
        AdminUsersService.banUser(
          MOCK_SUPER_ADMIN_ID,
          MOCK_SUPER_ADMIN_ID,
          "Banning last super admin"
        )
      ).rejects.toThrow(
        "Critical protection: Cannot demote, suspend, or revoke the last remaining active SUPER_ADMIN"
      );
    });
  });

  // ============================================================================
  // 6. REQUIREMENT 4: IMMUTABLE AUDIT RECORDS & SECRET REDACTION
  // ============================================================================
  describe("6. Requirement 4: Immutable Audit Trail & Cryptographic Secret Redaction", () => {
    it("should automatically redact passwords, tokens, secretConfiguration, and hashes from audit logs", () => {
      const rawMetadata = {
        codename: "Agent007",
        secretConfiguration: { cipherKey: "AES256_PRIVATE", answer: "SECRET" },
        token: "tg_init_secret_9988",
        solutionHash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        nested: {
          authorization: "Bearer secret-jwt",
          safeField: "Standard narrative note",
        },
      };

      const sanitized = AdminAuditService.sanitizeMetadata(rawMetadata);

      expect(sanitized.secretConfiguration).toBe("[REDACTED_SECRET]");
      expect(sanitized.token).toBe("[REDACTED_SECRET]");
      expect(sanitized.solutionHash).toBe("[REDACTED_SECRET]");
      expect(sanitized.nested.authorization).toBe("[REDACTED_SECRET]");
      expect(sanitized.nested.safeField).toBe("Standard narrative note");
      expect(sanitized.codename).toBe("Agent007");
    });

    it("should record audit logs transactionally during user suspension", async () => {
      const mockTx = {
        $executeRaw: vi.fn().mockResolvedValue(1),
        user: {
          findUnique: vi.fn().mockResolvedValue({ id: MOCK_PLAYER_ID, status: UserStatus.ACTIVE }),
          update: vi.fn().mockResolvedValue({ id: MOCK_PLAYER_ID, status: UserStatus.SUSPENDED }),
        },
        authSession: {
          updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        },
        adminAuditLog: {
          create: vi.fn().mockResolvedValue({ id: "audit_1" }),
        },
        adminRole: {
          findUnique: vi
            .fn()
            .mockResolvedValue({ id: MOCK_ROLE_SUPER_ID, name: DEFAULT_ADMIN_ROLES.SUPER_ADMIN }),
        },
        adminUserRole: {
          findUnique: vi.fn().mockResolvedValue(null), // Target is not a super admin
          count: vi.fn().mockResolvedValue(1),
        },
      };

      vi.spyOn(prisma, "$transaction").mockImplementation(async (cb: any) => cb(mockTx));

      await AdminUsersService.suspendUser(
        MOCK_SUPER_ADMIN_ID,
        MOCK_PLAYER_ID,
        "Malicious behavior observed"
      );

      expect(mockTx.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: MOCK_PLAYER_ID },
          data: expect.objectContaining({
            status: UserStatus.SUSPENDED,
            suspensionReason: "Malicious behavior observed",
          }),
        })
      );
      expect(mockTx.adminAuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: "USER_SUSPEND",
            resourceId: MOCK_PLAYER_ID,
          }),
        })
      );
    });
  });

  // ============================================================================
  // 7. REQUIREMENT 1: BOOTSTRAP PERMANENT LOCKOUT
  // ============================================================================
  describe("7. Requirement 1: One-Time Bootstrap CLI & Permanent Lockout", () => {
    it("should permanently reject bootstrap if any SUPER_ADMIN already exists in database", async () => {
      vi.spyOn(prisma, "$transaction").mockImplementation(async (cb: any) => cb(prisma));
      (prisma as any).$executeRaw = vi.fn().mockResolvedValue(1);

      vi.spyOn(prisma.adminRole, "findUnique").mockResolvedValue({
        id: MOCK_ROLE_SUPER_ID,
        name: DEFAULT_ADMIN_ROLES.SUPER_ADMIN,
      } as any);

      // 1 super admin already exists
      vi.spyOn(prisma.adminUserRole, "count").mockResolvedValue(1);

      await expect(
        AdminBootstrapService.bootstrapInitialSuperAdmin({ targetIdentifier: "new_admin" })
      ).rejects.toThrow(
        "Bootstrap procedure is permanently disabled: one or more Super Administrators are already registered."
      );
    });

    it("should reject API bootstrap route if operational secret is invalid", async () => {
      process.env.ADMIN_BOOTSTRAP_SECRET = "super_secure_operational_token_99999";

      const req = new NextRequest("http://localhost:3000/api/admin/bootstrap", {
        method: "POST",
        body: JSON.stringify({
          targetIdentifier: "operative_one",
          bootstrapSecret: "wrong_secret_token",
        }),
      });

      const res = await bootstrapRoute(req);
      const json = await res.json();

      expect(res.status).toBe(403);
      expect(json.code).toBe("INVALID_BOOTSTRAP_SECRET");
    });
  });

  // ============================================================================
  // 8. FINAL SECURITY AUDIT HARDENING & CONCURRENCY VERIFICATION
  // ============================================================================
  describe("8. Final Security Audit Hardening & Concurrency Protection", () => {
    const MOCK_SUPER_ADMIN_2_ID = "00000000-0000-4000-a000-000000000099";

    // --------------------------------------------------------------------------
    // A. Concurrency Safety: Mutual SuperAdmin Demotion
    // --------------------------------------------------------------------------
    it("should safely serialize concurrent SuperAdmin demotions and prevent mutual lockout", async () => {
      // Setup state: exactly 2 active super admins exist initially
      let activeSuperAdmins = new Set([MOCK_SUPER_ADMIN_ID, MOCK_SUPER_ADMIN_2_ID]);
      let advisoryLockHolder: string | null = null;

      // Mock database transaction simulating PostgreSQL transaction advisory lock serialization
      const createMockTx = (actorId: string, targetId: string) => {
        return {
          $executeRaw: vi.fn().mockImplementation(async (query: any) => {
            // Simulate pg_advisory_xact_lock: only one transaction holds the lock at a time
            while (advisoryLockHolder !== null && advisoryLockHolder !== actorId) {
              await new Promise((resolve) => setTimeout(resolve, 10));
            }
            advisoryLockHolder = actorId;
            return 1;
          }),
          adminRole: {
            findUnique: vi
              .fn()
              .mockResolvedValue({ id: MOCK_ROLE_SUPER_ID, name: DEFAULT_ADMIN_ROLES.SUPER_ADMIN }),
          },
          adminUserRole: {
            findUnique: vi.fn().mockImplementation(async ({ where }: any) => {
              const uId = where.userId_roleId?.userId || where.userId;
              return activeSuperAdmins.has(uId)
                ? { userId: uId, roleId: MOCK_ROLE_SUPER_ID }
                : null;
            }),
            count: vi.fn().mockImplementation(async () => activeSuperAdmins.size),
            deleteMany: vi.fn().mockImplementation(async ({ where }: any) => {
              activeSuperAdmins.delete(where.userId);
              return { count: 1 };
            }),
          },
          adminAuditLog: {
            create: vi.fn().mockResolvedValue({ id: "audit_conc_1" }),
          },
        };
      };

      // Mock actor clearance lookups
      (vi.spyOn(prisma.user, "findUnique") as any).mockImplementation(async ({ where }: any) => {
        const id = where.id;
        if (activeSuperAdmins.has(id)) {
          return {
            id,
            telegramId: BigInt(12345),
            status: UserStatus.ACTIVE,
            adminRoles: [{ role: { name: DEFAULT_ADMIN_ROLES.SUPER_ADMIN, permissions: [] } }],
          } as any;
        }
        return null;
      });

      vi.spyOn(prisma.adminRole, "findUnique").mockResolvedValue({
        id: MOCK_ROLE_SUPER_ID,
        name: DEFAULT_ADMIN_ROLES.SUPER_ADMIN,
        permissions: [],
      } as any);

      // Concurrently execute Op 1 (Admin 1 revokes Admin 2) and Op 2 (Admin 2 revokes Admin 1)
      vi.spyOn(prisma, "$transaction").mockImplementation(async (cb: any) => {
        const actor = advisoryLockHolder === null ? MOCK_SUPER_ADMIN_ID : MOCK_SUPER_ADMIN_2_ID;
        const tx = createMockTx(
          actor,
          actor === MOCK_SUPER_ADMIN_ID ? MOCK_SUPER_ADMIN_2_ID : MOCK_SUPER_ADMIN_ID
        );
        try {
          const result = await cb(tx);
          return result;
        } finally {
          if (advisoryLockHolder === actor) {
            advisoryLockHolder = null;
          }
        }
      });

      const op1 = AdminRolesService.revokeRoleFromUser(
        MOCK_SUPER_ADMIN_ID,
        MOCK_SUPER_ADMIN_2_ID,
        MOCK_ROLE_SUPER_ID
      );
      const op2 = AdminRolesService.revokeRoleFromUser(
        MOCK_SUPER_ADMIN_2_ID,
        MOCK_SUPER_ADMIN_ID,
        MOCK_ROLE_SUPER_ID
      );

      const results = await Promise.allSettled([op1, op2]);

      // Verify that at least one succeeded and at least one was rejected
      const fulfilled = results.filter((r) => r.status === "fulfilled");
      const rejected = results.filter((r) => r.status === "rejected");

      expect(fulfilled.length).toBe(1);
      expect(rejected.length).toBe(1);

      // Verify rejection error is LAST_SUPER_ADMIN_PROTECTION
      const rejectedError = (rejected[0] as PromiseRejectedResult).reason;
      expect(rejectedError.code).toBe("LAST_SUPER_ADMIN_PROTECTION");

      // Invariant verification: The database NEVER ends with 0 active SuperAdmins!
      expect(activeSuperAdmins.size).toBe(1);
    });

    // --------------------------------------------------------------------------
    // B. Concurrency Safety: Simultaneous Bootstrap Attempts
    // --------------------------------------------------------------------------
    it("should safely serialize simultaneous bootstrap attempts and permit exactly one initial SuperAdmin", async () => {
      let registeredAdminsCount = 0;
      let bootstrapLockHolder: string | null = null;

      vi.spyOn(prisma, "$transaction").mockImplementation(async (cb: any) => {
        const callerId = Math.random().toString();
        // Simulate pg_advisory_xact_lock
        while (bootstrapLockHolder !== null) {
          await new Promise((resolve) => setTimeout(resolve, 10));
        }
        bootstrapLockHolder = callerId;

        const mockTx = {
          $executeRaw: vi.fn().mockResolvedValue(1),
          adminRole: {
            findUnique: vi.fn().mockResolvedValue({
              id: MOCK_ROLE_SUPER_ID,
              name: DEFAULT_ADMIN_ROLES.SUPER_ADMIN,
            }),
          },
          adminUserRole: {
            count: vi.fn().mockImplementation(async () => registeredAdminsCount),
            upsert: vi.fn().mockImplementation(async () => {
              registeredAdminsCount++;
              return {};
            }),
          },
          user: {
            findFirst: vi.fn().mockResolvedValue({
              id: "00000000-0000-4000-a000-000000000088",
              telegramId: BigInt(888888),
              profile: { codename: "FirstOperative" },
            }),
          },
          adminAuditLog: {
            create: vi.fn().mockResolvedValue({ id: "audit_boot_1" }),
          },
        };

        try {
          return await cb(mockTx);
        } finally {
          bootstrapLockHolder = null;
        }
      });

      const secret = process.env.ADMIN_BOOTSTRAP_SECRET;
      const attempt1 = AdminBootstrapService.bootstrapInitialSuperAdmin({
        targetIdentifier: "FirstOperative",
        bootstrapSecret: secret,
      });
      const attempt2 = AdminBootstrapService.bootstrapInitialSuperAdmin({
        targetIdentifier: "FirstOperative",
        bootstrapSecret: secret,
      });

      const results = await Promise.allSettled([attempt1, attempt2]);

      const fulfilled = results.filter((r) => r.status === "fulfilled");
      const rejected = results.filter((r) => r.status === "rejected");

      expect(fulfilled.length).toBe(1);
      expect(rejected.length).toBe(1);

      // Verify that second attempt was rejected with BOOTSTRAP_PERMANENTLY_DISABLED
      const rejReason = (rejected[0] as PromiseRejectedResult).reason;
      expect(rejReason.code).toBe("BOOTSTRAP_PERMANENTLY_DISABLED");
      expect(registeredAdminsCount).toBe(1);
    });

    // --------------------------------------------------------------------------
    // C. Account Moderation: Active Session Invalidation & Request Enforcement
    // --------------------------------------------------------------------------
    it("should invalidate active sessions and block requests with ACCOUNT_INACTIVE when user is suspended", async () => {
      const mockTx = {
        $executeRaw: vi.fn().mockResolvedValue(1),
        user: {
          findUnique: vi.fn().mockResolvedValue({ id: MOCK_PLAYER_ID, status: UserStatus.ACTIVE }),
          update: vi.fn().mockResolvedValue({ id: MOCK_PLAYER_ID, status: UserStatus.SUSPENDED }),
        },
        authSession: {
          updateMany: vi.fn().mockResolvedValue({ count: 2 }), // Invalidate 2 active sessions
        },
        adminAuditLog: {
          create: vi.fn().mockResolvedValue({ id: "audit_susp_1" }),
        },
        adminRole: {
          findUnique: vi
            .fn()
            .mockResolvedValue({ id: MOCK_ROLE_SUPER_ID, name: DEFAULT_ADMIN_ROLES.SUPER_ADMIN }),
        },
        adminUserRole: {
          findUnique: vi.fn().mockResolvedValue(null),
          count: vi.fn().mockResolvedValue(1),
        },
      };

      vi.spyOn(prisma, "$transaction").mockImplementation(async (cb: any) => cb(mockTx));

      // Suspend player
      await AdminUsersService.suspendUser(
        MOCK_SUPER_ADMIN_ID,
        MOCK_PLAYER_ID,
        "Repeated policy breach observed in forensic investigation"
      );

      // Verify all active sessions were revoked in database
      expect(mockTx.authSession.updateMany).toHaveBeenCalledWith({
        where: {
          userId: MOCK_PLAYER_ID,
          revokedAt: null,
        },
        data: {
          revokedAt: expect.any(Date),
        },
      });

      // Verify session validation rejects suspended user
      vi.spyOn(prisma.authSession, "findUnique").mockResolvedValue({
        id: "sess_1",
        userId: MOCK_PLAYER_ID,
        tokenHash: "abc",
        revokedAt: null,
        expiresAt: new Date(Date.now() + 100000),
        lastActivityAt: new Date(),
        user: {
          id: MOCK_PLAYER_ID,
          telegramId: BigInt(9999),
          status: UserStatus.SUSPENDED,
          profile: null,
        },
      } as any);

      const sessionValidation = await SessionService.validateSession("mock_token");
      expect(sessionValidation.authenticated).toBe(false);
      if (!sessionValidation.authenticated) {
        expect(sessionValidation.reason).toBe("Account status is SUSPENDED");
      }

      // Verify auth guard requireAuthenticatedUser rejects with HTTP 403 ACCOUNT_INACTIVE
      vi.spyOn(authGuard, "getCurrentSession").mockResolvedValue({
        authenticated: false,
        reason: "Account status is SUSPENDED",
      });

      await expect(authGuard.requireAuthenticatedUser()).rejects.toThrow(
        "Access denied: Account status is SUSPENDED"
      );
    });

    // --------------------------------------------------------------------------
    // D. Indirect & Direct Privilege Escalation Prevention
    // --------------------------------------------------------------------------
    it("should prevent non-SUPER_ADMIN from modifying the SUPER_ADMIN role", async () => {
      vi.spyOn(prisma.user, "findUnique").mockResolvedValue({
        id: MOCK_CASE_AUTHOR_ID,
        telegramId: BigInt(222222),
        status: UserStatus.ACTIVE,
        adminRoles: [
          {
            role: {
              name: DEFAULT_ADMIN_ROLES.CASE_AUTHOR,
              permissions: [{ permission: { action: ADMIN_PERMISSIONS.ROLE_UPDATE } }],
            },
          },
        ],
      } as any);

      vi.spyOn(prisma.adminRole, "findUnique").mockResolvedValue({
        id: MOCK_ROLE_SUPER_ID,
        name: DEFAULT_ADMIN_ROLES.SUPER_ADMIN,
        permissions: [],
      } as any);

      await expect(
        AdminRolesService.updateRole(MOCK_CASE_AUTHOR_ID, MOCK_ROLE_SUPER_ID, {
          description: "Malicious tampering with Super Admin role",
        })
      ).rejects.toThrow(
        "Privilege escalation denied: Only a Super Administrator can modify the SUPER_ADMIN role"
      );
    });

    it("should prevent non-SUPER_ADMIN from revoking a role with permissions they do not possess", async () => {
      vi.spyOn(prisma.user, "findUnique").mockResolvedValue({
        id: MOCK_MODERATOR_ID,
        telegramId: BigInt(333333),
        status: UserStatus.ACTIVE,
        adminRoles: [
          {
            role: {
              name: DEFAULT_ADMIN_ROLES.MODERATOR,
              permissions: [{ permission: { action: ADMIN_PERMISSIONS.ROLE_ASSIGN } }],
            },
          },
        ],
      } as any);

      vi.spyOn(prisma.adminRole, "findUnique").mockResolvedValue({
        id: "role_case_director",
        name: "CASE_DIRECTOR",
        permissions: [{ permission: { action: ADMIN_PERMISSIONS.CASE_MANAGE_SOLUTION } }],
      } as any);

      await expect(
        AdminRolesService.revokeRoleFromUser(
          MOCK_MODERATOR_ID,
          MOCK_PLAYER_ID,
          "role_case_director"
        )
      ).rejects.toThrow(
        "Privilege escalation denied: You cannot revoke a role granting permissions you do not possess"
      );
    });

    // --------------------------------------------------------------------------
    // E. Secret Solution & Puzzle Secret Scrubbing Verification
    // --------------------------------------------------------------------------
    it("should strip solutionConfig in listCases to ensure zero leakage across list queries", async () => {
      vi.spyOn(prisma.case, "findMany").mockResolvedValue([
        {
          id: MOCK_CASE_ID,
          caseCode: "CASE-001",
          title: "The Midnight Protocol",
          solutionConfig: { primaryCharacterId: "secret_suspect_99" },
          campaign: { id: "camp_1", title: "Campaign Alpha", slug: "alpha" },
          _count: { chapters: 2, characters: 4, clues: 6, puzzles: 3, investigations: 1 },
        },
      ] as any);

      const cases = await AdminContentService.listCases();
      expect(cases.length).toBe(1);
      expect((cases[0] as any).solutionConfig).toBeUndefined();
      expect(cases[0].title).toBe("The Midnight Protocol");
    });

    it("should strip puzzle secretConfiguration and solutionHash from stages and root puzzle in getCaseDetail without PUZZLE_MANAGE_SECRET", async () => {
      vi.spyOn(prisma.case, "findUnique").mockResolvedValue({
        id: MOCK_CASE_ID,
        caseCode: "CASE-001",
        title: "The Midnight Protocol",
        solutionConfig: { secret: "case_solution" },
        chapters: [],
        characters: [],
        clues: [],
        puzzles: [
          {
            id: MOCK_PUZZLE_ID,
            title: "Cipher Challenge",
            solutionHash: "hash_root_12345",
            secretConfiguration: { keyword: "ENIGMA" },
            stages: [
              {
                id: "stage_1",
                title: "Stage 1",
                solutionHash: "hash_stage_67890",
                secretConfiguration: { cipherShift: 7 },
              },
            ],
          },
        ],
        _count: { investigations: 10 },
      } as any);

      // Fetch without secrets: includeSecretSolution = false, includePuzzleSecrets = false
      const safeCase = await AdminContentService.getCaseDetail(MOCK_CASE_ID, false, false);

      expect((safeCase as any).solutionConfig).toBeUndefined();
      expect((safeCase.puzzles[0] as any).solutionHash).toBeUndefined();
      expect((safeCase.puzzles[0] as any).secretConfiguration).toBeUndefined();
      expect((safeCase.puzzles[0].stages[0] as any).solutionHash).toBeUndefined();
      expect((safeCase.puzzles[0].stages[0] as any).secretConfiguration).toBeUndefined();
      expect(safeCase.puzzles[0].title).toBe("Cipher Challenge");
    });

    it("should strip secretConfiguration on stages in getPuzzleDetail when includeSecrets is false", async () => {
      vi.spyOn(prisma.puzzle, "findUnique").mockResolvedValue({
        id: MOCK_PUZZLE_ID,
        title: "Multi-Stage Quantum Lock",
        solutionHash: "root_hash_secret",
        secretConfiguration: { masterKey: "OMEGA_KEY" },
        stages: [
          {
            id: "stage_alpha",
            stageOrder: 1,
            solutionHash: "stage_hash_secret",
            secretConfiguration: { pin: "9911" },
            publicConfiguration: { hint: "First four digits of pi" },
          },
        ],
      } as any);

      const safePuzzle = await AdminContentService.getPuzzleDetail(MOCK_PUZZLE_ID, false);

      expect((safePuzzle as any).solutionHash).toBeUndefined();
      expect((safePuzzle as any).secretConfiguration).toBeUndefined();
      expect((safePuzzle.stages[0] as any).solutionHash).toBeUndefined();
      expect((safePuzzle.stages[0] as any).secretConfiguration).toBeUndefined();
      expect(safePuzzle.stages[0].publicConfiguration).toBeDefined();
    });

    // --------------------------------------------------------------------------
    // F. Audit Immutability: Transactional Rollback
    // --------------------------------------------------------------------------
    it("should bubble error and abort transaction if audit logging fails inside transactional context", async () => {
      const mockTx = {
        adminAuditLog: {
          create: vi
            .fn()
            .mockRejectedValue(new Error("Database disk full or constraint violation")),
        },
      };

      await expect(
        AdminAuditService.recordAction(
          {
            actorId: MOCK_SUPER_ADMIN_ID,
            action: "TEST_ACTION",
            resourceType: "TestResource",
          },
          mockTx as any
        )
      ).rejects.toThrow("Database disk full or constraint violation");
    });
  });
});
