import { prisma } from "@/server/infrastructure/database";
import { AppError } from "@/lib/errors/app-error";
import { InvestigationStatus, ParticipantStatus } from "@prisma/client";
import { getLevelProgress } from "../utils/progression.util";
import type {
  PlayerProgressionDto,
  SafeAchievementDto,
  SafeXPTransactionDto,
} from "../types/progression.types";

export class ProgressionService {
  /**
   * Retrieves comprehensive progression intelligence for an operative.
   */
  public static async getPlayerProgression(userId: string): Promise<PlayerProgressionDto> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });

    if (!user || !user.profile) {
      throw new AppError("Investigator profile not found", 404, "PLAYER_NOT_FOUND");
    }

    const playerId = user.profile.id;

    const [completedInvestigationsCount, totalAchievementsCount, userAchievements, recentTx] =
      await Promise.all([
        prisma.investigationParticipant.count({
          where: {
            playerId,
            investigation: { status: InvestigationStatus.SOLVED },
          },
        }),
        prisma.achievement.count(),
        prisma.userAchievement.count({
          where: { playerId },
        }),
        prisma.xPTransaction.findMany({
          where: { playerId },
          orderBy: { createdAt: "desc" },
          take: 20,
        }),
      ]);

    const levelProgress = getLevelProgress(user.profile.xp);

    const recentTransactions: SafeXPTransactionDto[] = recentTx.map((tx) => ({
      id: tx.id,
      amount: tx.amount,
      reason: tx.reason,
      referenceKey: tx.referenceKey,
      investigationId: tx.investigationId,
      createdAt: tx.createdAt.toISOString(),
    }));

    return {
      playerId,
      codename: user.profile.codename,
      displayName: user.profile.displayName,
      totalXP: user.profile.xp,
      level: user.profile.level,
      rank: levelProgress.rank,
      levelProgress,
      completedInvestigationsCount,
      unlockedAchievementsCount: userAchievements,
      totalAchievementsCount,
      recentTransactions,
    };
  }

  /**
   * Retrieves all achievements with unlock state for the operative.
   */
  public static async getPlayerAchievements(userId: string): Promise<SafeAchievementDto[]> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });

    if (!user || !user.profile) {
      throw new AppError("Investigator profile not found", 404, "PLAYER_NOT_FOUND");
    }

    const playerId = user.profile.id;

    const [achievements, userUnlocks] = await Promise.all([
      prisma.achievement.findMany({
        orderBy: [{ category: "asc" }, { code: "asc" }],
      }),
      prisma.userAchievement.findMany({
        where: { playerId },
        select: { achievementId: true, unlockedAt: true },
      }),
    ]);

    const unlockMap = new Map(userUnlocks.map((u) => [u.achievementId, u.unlockedAt]));

    return achievements.map((ach) => {
      const unlockedAt = unlockMap.get(ach.id);
      return {
        id: ach.id,
        code: ach.code,
        title: ach.title,
        description: ach.description,
        iconUrl: ach.iconUrl,
        category: ach.category,
        criteria: (ach.criteria as Record<string, any>) || {},
        isUnlocked: !!unlockedAt,
        unlockedAt: unlockedAt ? unlockedAt.toISOString() : null,
      };
    });
  }
}
