import { prisma } from "@/server/infrastructure/database";
import { AppError } from "@/lib/errors/app-error";
import { requireAuthenticatedUser } from "@/modules/authentication/guards/auth.guard";
import { Prisma, UserStatus } from "@prisma/client";
import {
  ADMIN_PERMISSIONS,
  DEFAULT_ADMIN_ROLES,
  type AdminPermissionAction,
} from "../constants/admin-permissions";
import type { AdminActorContext } from "../types/admin.types";

export class AdminGuard {
  /**
   * Resolves the full administrative context (roles and flattened permissions) for a user.
   * Throws 401 if unauthenticated, 403 if user account is suspended or banned,
   * and 403 if user has no assigned administrative roles.
   */
  public static async requireAdmin(targetUserId?: string): Promise<AdminActorContext> {
    let userId = targetUserId;
    if (!userId) {
      const authUser = await requireAuthenticatedUser();
      userId = authUser.id;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: { select: { displayName: true, codename: true } },
        adminRoles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: { permission: true },
                },
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new AppError("Administrator account not found", 401, "UNAUTHORIZED");
    }

    if (user.status === UserStatus.BANNED || user.status === UserStatus.SUSPENDED) {
      throw new AppError(
        `Administrator access denied: Account status is ${user.status}`,
        403,
        "ACCOUNT_INACTIVE"
      );
    }

    if (!user.adminRoles || user.adminRoles.length === 0) {
      throw new AppError(
        "Access denied: Operational administrator clearance required",
        403,
        "ADMIN_CLEARANCE_REQUIRED"
      );
    }

    const roles: string[] = [];
    const permissions = new Set<string>();

    for (const assignment of user.adminRoles) {
      roles.push(assignment.role.name);
      for (const rp of assignment.role.permissions) {
        if (rp.permission?.action) {
          permissions.add(rp.permission.action);
        }
      }
    }

    const isSuperAdmin = roles.includes(DEFAULT_ADMIN_ROLES.SUPER_ADMIN);

    const displayName =
      user.profile?.displayName ||
      user.profile?.codename ||
      [user.firstName, user.lastName].filter(Boolean).join(" ") ||
      user.telegramUsername ||
      "Administrator";

    return {
      userId: user.id,
      telegramId: user.telegramId.toString(),
      telegramUsername: user.telegramUsername,
      displayName,
      roles,
      permissions,
      isSuperAdmin,
    };
  }

  /**
   * Requires that the caller has a specific administrative permission.
   * Super administrators automatically satisfy all permission checks.
   */
  public static async requirePermission(
    permission: AdminPermissionAction,
    targetUserId?: string
  ): Promise<AdminActorContext> {
    const context = await this.requireAdmin(targetUserId);

    if (context.isSuperAdmin) {
      return context;
    }

    if (!context.permissions.has(permission)) {
      throw new AppError(
        `Privilege violation: Missing required permission '${permission}'`,
        403,
        "INSUFFICIENT_PERMISSIONS"
      );
    }

    return context;
  }

  /**
   * Requires that the caller has at least one permission from the provided list.
   */
  public static async requireAnyPermission(
    permissions: AdminPermissionAction[],
    targetUserId?: string
  ): Promise<AdminActorContext> {
    const context = await this.requireAdmin(targetUserId);

    if (context.isSuperAdmin) {
      return context;
    }

    const hasAny = permissions.some((p) => context.permissions.has(p));
    if (!hasAny) {
      throw new AppError(
        `Privilege violation: Requires at least one of [${permissions.join(", ")}]`,
        403,
        "INSUFFICIENT_PERMISSIONS"
      );
    }

    return context;
  }

  /**
   * Prevents self-lockout by verifying there is at least one other active SUPER_ADMIN
   * before revoking, demoting, suspending, or banning a user's SUPER_ADMIN status.
   * Utilizes a PostgreSQL transaction-level advisory lock to serialize concurrent
   * operations modifying the Super Administrator invariant.
   */
  public static async assertNotDemotingLastSuperAdmin(
    targetUserId: string,
    tx?: Prisma.TransactionClient
  ): Promise<void> {
    const db = tx || prisma;

    // Acquire PostgreSQL transaction-level advisory lock to serialize concurrent SuperAdmin invariant operations
    if (typeof db.$executeRaw === "function") {
      await db.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('super_admin_invariant_lock'))`;
    }

    const superAdminRole = await db.adminRole.findUnique({
      where: { name: DEFAULT_ADMIN_ROLES.SUPER_ADMIN },
    });

    if (!superAdminRole) return;

    // Check if target user is currently a SUPER_ADMIN
    const targetAssignment = await db.adminUserRole.findUnique({
      where: {
        userId_roleId: {
          userId: targetUserId,
          roleId: superAdminRole.id,
        },
      },
    });

    if (!targetAssignment) return; // Not a super admin, safe to modify

    // Count remaining active super admins with advisory lock held
    const totalSuperAdmins = await db.adminUserRole.count({
      where: {
        roleId: superAdminRole.id,
        user: { status: UserStatus.ACTIVE },
      },
    });

    if (totalSuperAdmins <= 1) {
      throw new AppError(
        "Critical protection: Cannot demote, suspend, or revoke the last remaining active SUPER_ADMIN",
        400,
        "LAST_SUPER_ADMIN_PROTECTION"
      );
    }
  }
}
