import { prisma } from "@/server/infrastructure/database";
import { AppError } from "@/lib/errors/app-error";
import { InvestigationStatus, PlayMode, Prisma } from "@prisma/client";
import { AdminAuditService } from "./audit.service";

export class AdminInvestigationService {
  /**
   * Retrieves a paginated list of operational investigation sessions with filters.
   */
  public static async listInvestigations(params: {
    page?: number;
    limit?: number;
    status?: InvestigationStatus;
    playMode?: PlayMode;
    caseId?: string;
  }) {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.InvestigationWhereInput = {};
    if (params.status) where.status = params.status;
    if (params.playMode) where.playMode = params.playMode;
    if (params.caseId) where.caseId = params.caseId;

    const [total, investigations] = await Promise.all([
      prisma.investigation.count({ where }),
      prisma.investigation.findMany({
        where,
        include: {
          case: { select: { id: true, caseCode: true, title: true, difficulty: true } },
          team: { select: { id: true, name: true, teamCode: true } },
          participants: {
            include: {
              player: { select: { id: true, codename: true, displayName: true, level: true } },
            },
          },
          submissions: {
            select: {
              id: true,
              status: true,
              evaluation: { select: { score: true, result: true } },
            },
            take: 1,
            orderBy: { createdAt: "desc" },
          },
        },
        orderBy: { startedAt: "desc" },
        skip,
        take: limit,
      }),
    ]);

    const formatted = investigations.map((inv) => ({
      id: inv.id,
      case: inv.case,
      team: inv.team,
      status: inv.status,
      playMode: inv.playMode,
      startedAt: inv.startedAt.toISOString(),
      completedAt: inv.completedAt ? inv.completedAt.toISOString() : null,
      participantCount: inv.participants.length,
      participants: inv.participants.map((p) => ({
        playerId: p.player.id,
        codename: p.player.codename,
        displayName: p.player.displayName,
        level: p.player.level,
      })),
      latestSubmission: inv.submissions[0] || null,
    }));

    return {
      investigations: formatted,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Retrieves full operational telemetry for a specific investigation session.
   */
  public static async getInvestigationDetail(investigationId: string) {
    const inv = await prisma.investigation.findUnique({
      where: { id: investigationId },
      include: {
        case: {
          include: {
            chapters: { orderBy: { chapterOrder: "asc" } },
            characters: true,
          },
        },
        team: true,
        participants: {
          include: { player: true },
        },
        progress: {
          include: { chapter: true },
          orderBy: { chapter: { chapterOrder: "asc" } },
        },
        clueAssignments: {
          include: { clue: { select: { id: true, clueCode: true, title: true, clueType: true } } },
        },
        submissions: {
          include: { evaluation: true },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!inv) throw new AppError("Investigation session not found", 404, "INVESTIGATION_NOT_FOUND");
    return inv;
  }

  /**
   * Sets an investigation status (e.g. marking stalled sessions ABANDONED).
   */
  public static async updateInvestigationStatus(
    actorId: string,
    investigationId: string,
    status: InvestigationStatus,
    reason?: string
  ) {
    const inv = await prisma.investigation.findUnique({ where: { id: investigationId } });
    if (!inv) throw new AppError("Investigation session not found", 404, "INVESTIGATION_NOT_FOUND");

    const updated = await prisma.investigation.update({
      where: { id: investigationId },
      data: { status },
    });

    await AdminAuditService.recordAction({
      actorId,
      action: "INVESTIGATION_STATUS_OVERRIDE",
      resourceType: "Investigation",
      resourceId: investigationId,
      metadata: {
        previousStatus: inv.status,
        newStatus: status,
        reason: reason || "Administrative operational override",
      },
    });

    return updated;
  }
}
