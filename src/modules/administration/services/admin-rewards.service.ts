import { prisma } from "@/server/infrastructure/database";
import { AppError } from "@/lib/errors/app-error";
import { AchievementCategory, Prisma } from "@prisma/client";
import { RewardService } from "@/modules/progression/services/reward.service";
import { AdminAuditService } from "./audit.service";

export class AdminRewardsService {
  /**
   * Retrieves all registered platform achievements with unlock statistics.
   */
  public static async listAchievements() {
    const achievements = await prisma.achievement.findMany({
      include: {
        _count: { select: { unlockedBy: true } },
      },
      orderBy: [{ category: "asc" }, { code: "asc" }],
    });

    return achievements.map((a) => ({
      id: a.id,
      code: a.code,
      title: a.title,
      description: a.description,
      iconUrl: a.iconUrl,
      category: a.category,
      criteria: a.criteria,
      unlockedCount: a._count.unlockedBy,
      createdAt: a.createdAt.toISOString(),
    }));
  }

  /**
   * Creates a new platform milestone accolade.
   */
  public static async createAchievement(
    actorId: string,
    data: {
      code: string;
      title: string;
      description: string;
      iconUrl?: string | null;
      category: AchievementCategory;
      criteria: any;
    }
  ) {
    const cleanCode = data.code.trim().toUpperCase().replace(/\s+/g, "_");

    const existing = await prisma.achievement.findUnique({ where: { code: cleanCode } });
    if (existing)
      throw new AppError(
        `Achievement code '${cleanCode}' already exists`,
        409,
        "ACHIEVEMENT_EXISTS"
      );

    const achievement = await prisma.achievement.create({
      data: {
        code: cleanCode,
        title: data.title.trim(),
        description: data.description.trim(),
        iconUrl: data.iconUrl || null,
        category: data.category,
        criteria: data.criteria || {},
      },
    });

    await AdminAuditService.recordAction({
      actorId,
      action: "ACHIEVEMENT_CREATE",
      resourceType: "Achievement",
      resourceId: achievement.id,
      metadata: {
        code: achievement.code,
        title: achievement.title,
        category: achievement.category,
      },
    });

    return achievement;
  }

  /**
   * Updates an existing achievement's metadata and criteria.
   */
  public static async updateAchievement(
    actorId: string,
    achievementId: string,
    data: {
      title?: string;
      description?: string;
      iconUrl?: string | null;
      category?: AchievementCategory;
      criteria?: any;
    }
  ) {
    const achievement = await prisma.achievement.update({
      where: { id: achievementId },
      data: {
        ...(data.title ? { title: data.title.trim() } : {}),
        ...(data.description ? { description: data.description.trim() } : {}),
        ...(data.iconUrl !== undefined ? { iconUrl: data.iconUrl } : {}),
        ...(data.category ? { category: data.category } : {}),
        ...(data.criteria !== undefined ? { criteria: data.criteria } : {}),
      },
    });

    await AdminAuditService.recordAction({
      actorId,
      action: "ACHIEVEMENT_UPDATE",
      resourceType: "Achievement",
      resourceId: achievementId,
      metadata: { code: achievement.code, title: achievement.title },
    });

    return achievement;
  }

  /**
   * Retrieves a paginated history of XP transactions across the platform.
   */
  public static async listXPTransactions(params: {
    page?: number;
    limit?: number;
    playerId?: string;
  }) {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 25));
    const skip = (page - 1) * limit;

    const where: Prisma.XPTransactionWhereInput = {};
    if (params.playerId) where.playerId = params.playerId;

    const [total, txs] = await Promise.all([
      prisma.xPTransaction.count({ where }),
      prisma.xPTransaction.findMany({
        where,
        include: {
          player: { select: { id: true, codename: true, displayName: true, level: true } },
          investigation: { select: { id: true, case: { select: { caseCode: true } } } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
    ]);

    const formatted = txs.map((t) => ({
      id: t.id,
      playerId: t.playerId,
      playerCodename: t.player.codename,
      amount: t.amount,
      reason: t.reason,
      referenceKey: t.referenceKey,
      investigationCaseCode: t.investigation?.case.caseCode || null,
      createdAt: t.createdAt.toISOString(),
    }));

    return {
      transactions: formatted,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Executes a manual, audited XP adjustment for an operative.
   * Never bypasses RewardService. Enforces mandatory justification.
   */
  public static async adjustPlayerXP(
    actorId: string,
    params: {
      playerId: string;
      amount: number;
      reason: string;
    }
  ) {
    if (!params.reason || params.reason.trim().length < 5) {
      throw new AppError(
        "Manual XP adjustments require a substantive justification (min 5 chars)",
        400,
        "REASON_REQUIRED"
      );
    }

    if (params.amount === 0) {
      throw new AppError("XP adjustment amount cannot be zero", 400, "INVALID_AMOUNT");
    }

    const player = await prisma.playerProfile.findUnique({ where: { id: params.playerId } });
    if (!player) throw new AppError("Operative profile not found", 404, "PLAYER_NOT_FOUND");

    const referenceKey = `xp:admin_adjustment:${params.playerId}:${Date.now()}`;

    const result = await prisma.$transaction(async (tx) => {
      const award = await RewardService.awardXP(tx, {
        playerId: params.playerId,
        amount: params.amount,
        reason: `[ADMIN MODERATION] ${params.reason.trim()}`,
        referenceKey,
      });

      await AdminAuditService.recordAction(
        {
          actorId,
          action: "XP_MANUAL_ADJUSTMENT",
          resourceType: "PlayerProfile",
          resourceId: params.playerId,
          metadata: {
            playerCodename: player.codename,
            amount: params.amount,
            reason: params.reason.trim(),
            referenceKey,
            newXP: award.newXP,
            newLevel: award.newLevel,
          },
        },
        tx
      );

      return award;
    });

    return result;
  }
}
