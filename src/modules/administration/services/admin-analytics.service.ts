import { prisma } from "@/server/infrastructure/database";
import { ContentStatus, InvestigationStatus, AttemptStatus } from "@prisma/client";
import type { AdminDashboardMetricsDto, AdminAnalyticsMetricsDto } from "../types/admin.types";

export class AdminAnalyticsService {
  /**
   * Retrieves live, database-backed operational metrics for the Admin Dashboard overview.
   */
  public static async getDashboardMetrics(): Promise<AdminDashboardMetricsDto> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalPlayers,
      activePlayers30d,
      publishedCampaigns,
      publishedCases,
      activeInvestigations,
      completedInvestigations,
      totalClues,
      totalPuzzles,
      recentLogs,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { lastActiveAt: { gte: thirtyDaysAgo } } }),
      prisma.campaign.count({ where: { status: ContentStatus.PUBLISHED } }),
      prisma.case.count({ where: { status: ContentStatus.PUBLISHED } }),
      prisma.investigation.count({ where: { status: InvestigationStatus.IN_PROGRESS } }),
      prisma.investigation.count({
        where: {
          status: { in: [InvestigationStatus.SOLVED, InvestigationStatus.FAILED] },
        },
      }),
      prisma.clue.count(),
      prisma.puzzle.count(),
      prisma.adminAuditLog.findMany({
        include: {
          actor: {
            select: {
              telegramUsername: true,
              firstName: true,
              profile: { select: { displayName: true, codename: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 8,
      }),
    ]);

    const formattedLogs = recentLogs.map((log) => ({
      id: log.id,
      actorId: log.actorId,
      actorDisplayName:
        log.actor?.profile?.displayName ||
        log.actor?.profile?.codename ||
        log.actor?.firstName ||
        log.actor?.telegramUsername ||
        "System",
      action: log.action,
      resourceType: log.resourceType,
      resourceId: log.resourceId,
      metadata: (log.metadata as Record<string, any>) || null,
      createdAt: log.createdAt.toISOString(),
    }));

    return {
      totalPlayers,
      activePlayers30d,
      publishedCampaigns,
      publishedCases,
      activeInvestigations,
      completedInvestigations,
      totalClues,
      totalPuzzles,
      recentAuditLogs: formattedLogs,
    };
  }

  /**
   * Computes platform-wide performance analytics and deduction rates over bounded intervals.
   */
  public static async getPlatformAnalytics(): Promise<AdminAnalyticsMetricsDto> {
    const now = Date.now();
    const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);

    const [
      totalPlayers,
      activePlayers7d,
      activePlayers30d,
      investigationStarts30d,
      investigationCompletions30d,
      totalSolved,
      totalConcluded,
      casesData,
      totalPuzzleAttempts,
      correctPuzzleAttempts,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { lastActiveAt: { gte: sevenDaysAgo } } }),
      prisma.user.count({ where: { lastActiveAt: { gte: thirtyDaysAgo } } }),
      prisma.investigation.count({ where: { startedAt: { gte: thirtyDaysAgo } } }),
      prisma.investigation.count({
        where: {
          completedAt: { gte: thirtyDaysAgo },
          status: { in: [InvestigationStatus.SOLVED, InvestigationStatus.FAILED] },
        },
      }),
      prisma.investigation.count({ where: { status: InvestigationStatus.SOLVED } }),
      prisma.investigation.count({
        where: { status: { in: [InvestigationStatus.SOLVED, InvestigationStatus.FAILED] } },
      }),
      prisma.case.findMany({
        where: { status: ContentStatus.PUBLISHED },
        select: {
          caseCode: true,
          title: true,
          _count: {
            select: { investigations: true },
          },
          investigations: {
            where: { status: InvestigationStatus.SOLVED },
            select: { id: true },
          },
        },
        take: 10,
      }),
      prisma.puzzleAttempt.count(),
      prisma.puzzleAttempt.count({ where: { isCorrect: true } }),
    ]);

    const overallSolveRatePercent =
      totalConcluded > 0 ? Math.round((totalSolved / totalConcluded) * 100) : 0;

    const popularCases = casesData.map((c) => {
      const invCount = c._count.investigations;
      const solvedCount = c.investigations.length;
      return {
        caseCode: c.caseCode,
        title: c.title,
        investigationCount: invCount,
        solvedCount,
        solveRatePercent: invCount > 0 ? Math.round((solvedCount / invCount) * 100) : 0,
      };
    });

    const puzzleAccuracyPercent =
      totalPuzzleAttempts > 0 ? Math.round((correctPuzzleAttempts / totalPuzzleAttempts) * 100) : 0;

    return {
      totalPlayers,
      activePlayers7d,
      activePlayers30d,
      investigationStarts30d,
      investigationCompletions30d,
      overallSolveRatePercent,
      popularCases,
      puzzleStats: {
        totalAttempts: totalPuzzleAttempts,
        correctAttempts: correctPuzzleAttempts,
        accuracyPercent: puzzleAccuracyPercent,
      },
    };
  }
}
