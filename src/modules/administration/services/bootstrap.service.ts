import { prisma } from "@/server/infrastructure/database";
import { AppError } from "@/lib/errors/app-error";
import { logger } from "@/lib/logger";
import { DEFAULT_ADMIN_ROLES } from "../constants/admin-permissions";
import { AdminAuditService } from "./audit.service";
import crypto from "crypto";

export interface BootstrapResult {
  success: boolean;
  message: string;
  userId: string;
  telegramId: string;
  role: string;
}

export class AdminBootstrapService {
  /**
   * One-time initialization of the platform's initial SUPER_ADMIN.
   * Can be triggered safely via CLI command, seed script, or protected server secret token.
   *
   * Security constraints:
   * 1. Requires valid operational target (userId or telegramId).
   * 2. If an active SUPER_ADMIN already exists, rejects request with 409 CONFLICT unless forced via ADMIN_BOOTSTRAP_SECRET.
   * 3. Completely audited in AdminAuditLog.
   * 4. Zero hardcoded credentials.
   */
  public static async bootstrapInitialSuperAdmin(params: {
    targetIdentifier: string; // userId, codename, or telegramId
    bootstrapSecret?: string;
  }): Promise<BootstrapResult> {
    const { targetIdentifier, bootstrapSecret } = params;

    // Verify bootstrap secret if set in environment
    const configuredSecret = process.env.ADMIN_BOOTSTRAP_SECRET;
    if (configuredSecret && configuredSecret.length > 0) {
      if (!bootstrapSecret || bootstrapSecret !== configuredSecret) {
        throw new AppError(
          "Invalid or missing operational bootstrap secret",
          403,
          "INVALID_BOOTSTRAP_SECRET"
        );
      }
    }

    // Execute bootstrap atomically inside a database transaction protected by an advisory lock
    return prisma.$transaction(async (tx) => {
      // Concurrency protection: acquire PostgreSQL transaction advisory lock
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('admin_bootstrap_lock'))`;

      // 1. Locate the Super Admin role
      const superAdminRole = await tx.adminRole.findUnique({
        where: { name: DEFAULT_ADMIN_ROLES.SUPER_ADMIN },
      });

      if (!superAdminRole) {
        throw new AppError(
          "SUPER_ADMIN role is not seeded in database. Run database seed first.",
          500,
          "ROLE_NOT_CONFIGURED"
        );
      }

      // 2. Check if any Super Admin already exists under lock
      const existingSuperAdminCount = await tx.adminUserRole.count({
        where: { roleId: superAdminRole.id },
      });

      if (existingSuperAdminCount > 0) {
        throw new AppError(
          "Bootstrap procedure is permanently disabled: one or more Super Administrators are already registered. Role management must now be performed via authenticated administrator channels.",
          409,
          "BOOTSTRAP_PERMANENTLY_DISABLED"
        );
      }

      // 3. Find the target user by userId, telegramId, or codename
      const isBigInt = /^\d+$/.test(targetIdentifier);
      const isUUID =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
          targetIdentifier
        );

      const user = await tx.user.findFirst({
        where: {
          OR: [
            ...(isUUID ? [{ id: targetIdentifier }] : []),
            ...(isBigInt ? [{ telegramId: BigInt(targetIdentifier) }] : []),
            { profile: { codename: { equals: targetIdentifier, mode: "insensitive" as any } } },
          ],
        },
        include: { profile: true },
      });

      if (!user) {
        throw new AppError(
          `Target user identity '${targetIdentifier}' not found. The operative must authenticate once on Mystery Network first.`,
          404,
          "USER_NOT_FOUND"
        );
      }

      // 4. Assign the SUPER_ADMIN role idempotently
      await tx.adminUserRole.upsert({
        where: {
          userId_roleId: {
            userId: user.id,
            roleId: superAdminRole.id,
          },
        },
        update: {},
        create: {
          userId: user.id,
          roleId: superAdminRole.id,
        },
      });

      // 5. Audit the bootstrap event transactionally
      await AdminAuditService.recordAction(
        {
          actorId: user.id,
          action: "ADMIN_BOOTSTRAP_INITIAL_SUPER_ADMIN",
          resourceType: "AdminUserRole",
          resourceId: user.id,
          metadata: {
            telegramId: user.telegramId.toString(),
            codename: user.profile?.codename,
            assignedRole: DEFAULT_ADMIN_ROLES.SUPER_ADMIN,
            timestamp: new Date().toISOString(),
          },
        },
        tx
      );

      logger.info("Initial Super Administrator bootstrapped successfully", {
        userId: user.id,
        telegramId: user.telegramId.toString(),
        role: DEFAULT_ADMIN_ROLES.SUPER_ADMIN,
      });

      return {
        success: true,
        message: `User '${user.profile?.codename || user.id}' successfully assigned SUPER_ADMIN role.`,
        userId: user.id,
        telegramId: user.telegramId.toString(),
        role: DEFAULT_ADMIN_ROLES.SUPER_ADMIN,
      };
    });
  }
}
