import { prisma } from "@/server/infrastructure/database";
import { AppError } from "@/lib/errors/app-error";
import { Prisma, UserStatus, InvestigationStatus } from "@prisma/client";
import { AdminGuard } from "../guards/admin.guard";
import { AdminAuditService } from "./audit.service";
import type { SafeAdminUserDto } from "../types/admin.types";

export class AdminUsersService {
  /**
   * Retrieves a paginated list of registered operatives with filters and role mapping.
   */
  public static async listUsers(params: {
    page?: number;
    limit?: number;
    search?: string;
    status?: UserStatus;
  }): Promise<{ users: SafeAdminUserDto[]; total: number; page: number; totalPages: number }> {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.UserWhereInput = {};

    if (params.status) {
      where.status = params.status;
    }

    if (params.search && params.search.trim().length > 0) {
      const q = params.search.trim();
      const isBigInt = /^\d+$/.test(q);
      where.OR = [
        ...(isBigInt ? [{ telegramId: BigInt(q) }] : []),
        { telegramUsername: { contains: q, mode: "insensitive" } },
        { firstName: { contains: q, mode: "insensitive" } },
        { lastName: { contains: q, mode: "insensitive" } },
        { profile: { codename: { contains: q, mode: "insensitive" } } },
        { profile: { displayName: { contains: q, mode: "insensitive" } } },
      ];
    }

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        include: {
          profile: true,
          adminRoles: {
            include: { role: { select: { name: true } } },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
    ]);

    const formatted: SafeAdminUserDto[] = users.map((u) => ({
      id: u.id,
      telegramId: u.telegramId.toString(),
      telegramUsername: u.telegramUsername,
      firstName: u.firstName,
      lastName: u.lastName,
      status: u.status,
      suspensionReason: u.suspensionReason,
      suspendedAt: u.suspendedAt ? u.suspendedAt.toISOString() : null,
      lastActiveAt: u.lastActiveAt ? u.lastActiveAt.toISOString() : null,
      createdAt: u.createdAt.toISOString(),
      profile: u.profile
        ? {
            id: u.profile.id,
            codename: u.profile.codename,
            displayName: u.profile.displayName,
            xp: u.profile.xp,
            level: u.profile.level,
            avatarUrl: u.profile.avatarUrl,
          }
        : null,
      roles: u.adminRoles.map((r) => r.role.name),
    }));

    return {
      users: formatted,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Retrieves full administrative profile dossier for a specific player.
   */
  public static async getUserDetail(userId: string): Promise<
    SafeAdminUserDto & {
      achievements: any[];
      investigations: any[];
      recentAuditLogs: any[];
    }
  > {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: {
          include: {
            investigations: {
              include: {
                investigation: {
                  include: { case: { select: { caseCode: true, title: true } } },
                },
              },
              take: 20,
              orderBy: { joinedAt: "desc" },
            },
          },
        },
        adminRoles: {
          include: { role: { select: { id: true, name: true, description: true } } },
        },
      },
    });

    if (!user) {
      throw new AppError("Operative profile not found", 404, "USER_NOT_FOUND");
    }

    const playerId = user.profile?.id;

    const [userAchievements, recentAuditLogs] = await Promise.all([
      playerId
        ? prisma.userAchievement.findMany({
            where: { playerId },
            include: { achievement: true },
            orderBy: { unlockedAt: "desc" },
            take: 30,
          })
        : [],
      prisma.adminAuditLog.findMany({
        where: {
          OR: [{ actorId: user.id }, { resourceId: user.id }],
        },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
    ]);

    const solvedCount =
      user.profile?.investigations.filter(
        (p) => p.investigation.status === InvestigationStatus.SOLVED
      ).length || 0;

    return {
      id: user.id,
      telegramId: user.telegramId.toString(),
      telegramUsername: user.telegramUsername,
      firstName: user.firstName,
      lastName: user.lastName,
      status: user.status,
      suspensionReason: user.suspensionReason,
      suspendedAt: user.suspendedAt ? user.suspendedAt.toISOString() : null,
      lastActiveAt: user.lastActiveAt ? user.lastActiveAt.toISOString() : null,
      createdAt: user.createdAt.toISOString(),
      profile: user.profile
        ? {
            id: user.profile.id,
            codename: user.profile.codename,
            displayName: user.profile.displayName,
            xp: user.profile.xp,
            level: user.profile.level,
            avatarUrl: user.profile.avatarUrl,
          }
        : null,
      roles: user.adminRoles.map((r) => r.role.name),
      solvedCasesCount: solvedCount,
      achievements: userAchievements.map((ua) => ({
        id: ua.achievement.id,
        code: ua.achievement.code,
        title: ua.achievement.title,
        description: ua.achievement.description,
        unlockedAt: ua.unlockedAt.toISOString(),
      })),
      investigations: (user.profile?.investigations || []).map((p) => ({
        id: p.investigation.id,
        caseCode: p.investigation.case.caseCode,
        caseTitle: p.investigation.case.title,
        status: p.investigation.status,
        playMode: p.investigation.playMode,
        startedAt: p.investigation.startedAt.toISOString(),
        completedAt: p.investigation.completedAt ? p.investigation.completedAt.toISOString() : null,
      })),
      recentAuditLogs: recentAuditLogs.map((log) => ({
        id: log.id,
        action: log.action,
        resourceType: log.resourceType,
        createdAt: log.createdAt.toISOString(),
      })),
    };
  }

  /**
   * Suspends an operative account with justification.
   * Transactionally protects the last active SUPER_ADMIN and records audit log.
   */
  public static async suspendUser(actorId: string, userId: string, reason: string): Promise<void> {
    if (!reason || reason.trim().length < 5) {
      throw new AppError(
        "Suspension requires a substantive reason (min 5 characters)",
        400,
        "REASON_REQUIRED"
      );
    }

    await prisma.$transaction(async (tx) => {
      // Protect last active super admin transactionally
      await AdminGuard.assertNotDemotingLastSuperAdmin(userId, tx);

      const user = await tx.user.findUnique({ where: { id: userId } });
      if (!user) throw new AppError("Target operative not found", 404, "USER_NOT_FOUND");

      await tx.user.update({
        where: { id: userId },
        data: {
          status: UserStatus.SUSPENDED,
          suspensionReason: reason.trim(),
          suspendedAt: new Date(),
        },
      });

      // Immediately invalidate all active sessions for this suspended user
      await tx.authSession.updateMany({
        where: {
          userId,
          revokedAt: null,
        },
        data: {
          revokedAt: new Date(),
        },
      });

      await AdminAuditService.recordAction(
        {
          actorId,
          action: "USER_SUSPEND",
          resourceType: "User",
          resourceId: userId,
          metadata: { reason, previousStatus: user.status },
        },
        tx
      );
    });
  }

  /**
   * Permanently bans an operative account for severe violations.
   * Transactionally protects the last active SUPER_ADMIN and records audit log.
   */
  public static async banUser(actorId: string, userId: string, reason: string): Promise<void> {
    if (!reason || reason.trim().length < 5) {
      throw new AppError(
        "Account ban requires a substantive reason (min 5 characters)",
        400,
        "REASON_REQUIRED"
      );
    }

    await prisma.$transaction(async (tx) => {
      // Protect last active super admin transactionally
      await AdminGuard.assertNotDemotingLastSuperAdmin(userId, tx);

      const user = await tx.user.findUnique({ where: { id: userId } });
      if (!user) throw new AppError("Target operative not found", 404, "USER_NOT_FOUND");

      await tx.user.update({
        where: { id: userId },
        data: {
          status: UserStatus.BANNED,
          suspensionReason: reason.trim(),
          suspendedAt: new Date(),
        },
      });

      // Immediately invalidate all active sessions for this banned user
      await tx.authSession.updateMany({
        where: {
          userId,
          revokedAt: null,
        },
        data: {
          revokedAt: new Date(),
        },
      });

      await AdminAuditService.recordAction(
        {
          actorId,
          action: "USER_BAN",
          resourceType: "User",
          resourceId: userId,
          metadata: { reason, previousStatus: user.status },
        },
        tx
      );
    });
  }

  /**
   * Restores an active status on a suspended or banned account transactionally.
   */
  public static async restoreUser(actorId: string, userId: string, reason: string): Promise<void> {
    await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { id: userId } });
      if (!user) throw new AppError("Target operative not found", 404, "USER_NOT_FOUND");

      await tx.user.update({
        where: { id: userId },
        data: {
          status: UserStatus.ACTIVE,
          suspensionReason: null,
          suspendedAt: null,
        },
      });

      await AdminAuditService.recordAction(
        {
          actorId,
          action: "USER_RESTORE",
          resourceType: "User",
          resourceId: userId,
          metadata: {
            reason: reason || "Account restored by administrator",
            previousStatus: user.status,
          },
        },
        tx
      );
    });
  }
}
