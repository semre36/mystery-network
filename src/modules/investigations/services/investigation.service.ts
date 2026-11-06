import { prisma } from "@/server/infrastructure/database";
import {
  ContentStatus,
  InvestigationStatus,
  ParticipantStatus,
  ChapterProgressStatus,
  PlayMode,
} from "@prisma/client";
import { AppError } from "@/lib/errors/app-error";
import { logger } from "@/lib/logger";
import type {
  SafeInvestigationSummaryDto,
  SafeInvestigationWorkspaceDto,
  SafeInvestigationChapterProgressDto,
  InvestigationQueryFilters,
} from "../types/investigation.types";
import type {
  PaginatedResponse,
  SafeCaseSummaryDto,
  SafeCharacterDto,
} from "@/modules/cases/types/case.types";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export class InvestigationService {
  /**
   * Resolves a player's profile ID from their authenticated User ID.
   */
  private static async getPlayerProfileId(userId: string): Promise<string> {
    const profile = await prisma.playerProfile.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!profile) {
      throw new AppError("Investigator profile not found for user", 404, "PLAYER_NOT_FOUND");
    }

    return profile.id;
  }

  /**
   * Internal helper to fetch an investigation with full details filtered for an authorized participant.
   */
  private static async fetchInvestigationWithDetails(investigationId: string, playerId: string) {
    return prisma.investigation.findUnique({
      where: { id: investigationId },
      include: {
        case: {
          include: {
            campaign: {
              select: {
                id: true,
                slug: true,
                title: true,
              },
            },
            characters: {
              select: {
                id: true,
                name: true,
                description: true,
                metadata: true,
              },
            },
            _count: {
              select: {
                chapters: {
                  where: { status: ContentStatus.PUBLISHED },
                },
                characters: true,
              },
            },
          },
        },
        participants: {
          where: { playerId, status: ParticipantStatus.ACTIVE },
        },
        progress: {
          include: {
            chapter: {
              select: {
                id: true,
                chapterOrder: true,
                title: true,
                description: true,
                status: true,
              },
            },
          },
          orderBy: {
            chapter: {
              chapterOrder: "asc",
            },
          },
        },
      },
    });
  }

  /**
   * Internal helper to build a sanitized SafeInvestigationWorkspaceDto.
   */
  private static buildWorkspace(investigation: any): SafeInvestigationWorkspaceDto {
    const participant = investigation.participants[0];
    const c = investigation.case;

    const safeCase: SafeCaseSummaryDto = {
      id: c.id,
      caseCode: c.caseCode,
      title: c.title,
      description: c.description,
      difficulty: c.difficulty,
      estimatedDurationMinutes: c.estimatedDurationMinutes,
      minPlayers: c.minPlayers,
      maxPlayers: c.maxPlayers,
      supportedPlayModes: c.supportedPlayModes,
      status: c.status,
      publishedAt: c.publishedAt ? c.publishedAt.toISOString() : null,
      campaign: c.campaign
        ? {
            id: c.campaign.id,
            slug: c.campaign.slug,
            title: c.campaign.title,
          }
        : null,
      chapterCount: c._count.chapters,
      characterCount: c._count.characters,
      isFeatured: c.caseCode === "CASE-001-MIDNIGHT-PROTOCOL",
    };

    const safeCharacters: SafeCharacterDto[] = c.characters.map((char: any) => {
      const meta =
        char.metadata && typeof char.metadata === "object"
          ? (char.metadata as Record<string, unknown>)
          : {};

      return {
        id: char.id,
        name: char.name,
        description: char.description,
        role: typeof meta.role === "string" ? meta.role : undefined,
        clearance: typeof meta.clearance === "string" ? meta.clearance : undefined,
        location: typeof meta.location === "string" ? meta.location : undefined,
      };
    });

    const safeChapters: SafeInvestigationChapterProgressDto[] = investigation.progress.map(
      (p: any) => ({
        chapterId: p.chapterId,
        chapterOrder: p.chapter.chapterOrder,
        title: p.chapter.title,
        description: p.chapter.description,
        status: p.status,
        unlockedAt: p.unlockedAt ? p.unlockedAt.toISOString() : null,
        completedAt: p.completedAt ? p.completedAt.toISOString() : null,
      })
    );

    const completedChaptersCount = safeChapters.filter(
      (ch) => ch.status === ChapterProgressStatus.COMPLETED
    ).length;

    const currentChapter =
      safeChapters.find((ch) => ch.status === ChapterProgressStatus.IN_PROGRESS) ??
      safeChapters.find((ch) => ch.status === ChapterProgressStatus.UNLOCKED) ??
      (safeChapters.length > 0 ? safeChapters[safeChapters.length - 1] : null);

    return {
      id: investigation.id,
      status: investigation.status,
      playMode: investigation.playMode,
      startedAt: investigation.startedAt.toISOString(),
      completedAt: investigation.completedAt ? investigation.completedAt.toISOString() : null,
      updatedAt: investigation.updatedAt.toISOString(),
      case: safeCase,
      characters: safeCharacters,
      chapters: safeChapters,
      currentChapter,
      completedChaptersCount,
      totalChapters: safeChapters.length,
      myParticipantStatus: participant.status,
    };
  }

  /**
   * Starts or resumes an investigation for an accessible published case.
   * Concurrency-safe: Reuses existing active or paused sessions to prevent accidental duplicates.
   */
  public static async startInvestigation(
    userId: string,
    caseIdentifier: string
  ): Promise<{ investigationId: string; wasResumed: boolean }> {
    const playerId = await this.getPlayerProfileId(userId);

    const trimmedCaseId = caseIdentifier.trim();
    if (!trimmedCaseId) {
      throw new AppError("Case identifier is required", 400, "INVALID_CASE_IDENTIFIER");
    }

    const isUuid = UUID_REGEX.test(trimmedCaseId);

    // Resolve published case definition
    const caseRecord = await prisma.case.findFirst({
      where: {
        status: ContentStatus.PUBLISHED,
        ...(isUuid
          ? { id: trimmedCaseId }
          : { caseCode: { equals: trimmedCaseId, mode: "insensitive" } }),
      },
      include: {
        chapters: {
          where: { status: ContentStatus.PUBLISHED },
          orderBy: { chapterOrder: "asc" },
        },
      },
    });

    if (!caseRecord) {
      throw new AppError("Published case dossier not found or restricted", 404, "CASE_NOT_FOUND");
    }

    // Execute atomic session creation or reuse in an interactive transaction
    return await prisma.$transaction(async (tx) => {
      // 1. Check for an existing non-terminal investigation for this player & case
      const existingParticipant = await tx.investigationParticipant.findFirst({
        where: {
          playerId,
          status: ParticipantStatus.ACTIVE,
          investigation: {
            caseId: caseRecord.id,
            status: {
              in: [
                InvestigationStatus.IN_PROGRESS,
                InvestigationStatus.PAUSED,
                InvestigationStatus.NOT_STARTED,
              ],
            },
          },
        },
        include: {
          investigation: true,
        },
      });

      if (existingParticipant) {
        const inv = existingParticipant.investigation;

        // If paused or not started, automatically transition to active IN_PROGRESS
        if (
          inv.status === InvestigationStatus.PAUSED ||
          inv.status === InvestigationStatus.NOT_STARTED
        ) {
          await tx.investigation.update({
            where: { id: inv.id },
            data: {
              status: InvestigationStatus.IN_PROGRESS,
              startedAt:
                inv.status === InvestigationStatus.NOT_STARTED ? new Date() : inv.startedAt,
              updatedAt: new Date(),
            },
          });

          logger.info("Resumed paused investigation session", {
            investigationId: inv.id,
            playerId,
            caseCode: caseRecord.caseCode,
          });
        }

        return {
          investigationId: inv.id,
          wasResumed: true,
        };
      }

      // 2. No active session exists. Create new investigation session.
      const newInvestigation = await tx.investigation.create({
        data: {
          caseId: caseRecord.id,
          status: InvestigationStatus.IN_PROGRESS,
          playMode: PlayMode.SOLO,
          startedAt: new Date(),
        },
      });

      // 3. Register initial participant as Lead Investigator
      await tx.investigationParticipant.create({
        data: {
          investigationId: newInvestigation.id,
          playerId,
          status: ParticipantStatus.ACTIVE,
          joinedAt: new Date(),
        },
      });

      // 4. Initialize chapter progression records
      if (caseRecord.chapters.length > 0) {
        const progressEntries = caseRecord.chapters.map((chapter) => ({
          investigationId: newInvestigation.id,
          chapterId: chapter.id,
          status:
            chapter.chapterOrder === 1
              ? ChapterProgressStatus.IN_PROGRESS
              : ChapterProgressStatus.LOCKED,
          unlockedAt: chapter.chapterOrder === 1 ? new Date() : null,
        }));

        await tx.investigationProgress.createMany({
          data: progressEntries,
        });
      }

      logger.info("Initialized new investigation session", {
        investigationId: newInvestigation.id,
        playerId,
        caseCode: caseRecord.caseCode,
        chapterCount: caseRecord.chapters.length,
      });

      return {
        investigationId: newInvestigation.id,
        wasResumed: false,
      };
    });
  }

  /**
   * Retrieves an authenticated player's complete workspace for an active investigation.
   * Enforces strict participant authorization and redacts all secret clues/puzzle solutions.
   */
  public static async getInvestigationWorkspace(
    userId: string,
    investigationId: string
  ): Promise<SafeInvestigationWorkspaceDto> {
    const playerId = await this.getPlayerProfileId(userId);

    const trimmedId = investigationId.trim();
    if (!trimmedId || !UUID_REGEX.test(trimmedId)) {
      throw new AppError("Invalid investigation session ID", 400, "INVALID_INVESTIGATION_ID");
    }

    const investigation = await this.fetchInvestigationWithDetails(trimmedId, playerId);

    if (!investigation) {
      throw new AppError(
        "Investigation session not found or restricted",
        404,
        "INVESTIGATION_NOT_FOUND"
      );
    }

    // Verify participant authorization
    if (investigation.participants.length === 0) {
      throw new AppError(
        "Access denied: You are not an active operative in this investigation",
        404,
        "INVESTIGATION_NOT_FOUND"
      );
    }

    return this.buildWorkspace(investigation);
  }

  /**
   * Retrieves an authenticated player's personal investigation history.
   */
  public static async getPlayerInvestigations(
    userId: string,
    filters: InvestigationQueryFilters = {}
  ): Promise<PaginatedResponse<SafeInvestigationSummaryDto>> {
    const playerId = await this.getPlayerProfileId(userId);

    const page = Math.max(1, filters.page ?? 1);
    const limit = Math.min(50, Math.max(1, filters.limit ?? 10));
    const skip = (page - 1) * limit;

    const where: any = {
      playerId,
      status: ParticipantStatus.ACTIVE,
    };

    if (filters.status) {
      where.investigation = {
        status: filters.status,
      };
    }

    const [participants, total] = await Promise.all([
      prisma.investigationParticipant.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          investigation: {
            updatedAt: "desc",
          },
        },
        include: {
          investigation: {
            include: {
              case: {
                select: {
                  id: true,
                  caseCode: true,
                  title: true,
                  difficulty: true,
                  estimatedDurationMinutes: true,
                },
              },
              progress: {
                select: {
                  status: true,
                  chapter: {
                    select: {
                      chapterOrder: true,
                    },
                  },
                },
                orderBy: {
                  chapter: {
                    chapterOrder: "asc",
                  },
                },
              },
              _count: {
                select: {
                  participants: true,
                },
              },
            },
          },
        },
      }),
      prisma.investigationParticipant.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    const items: SafeInvestigationSummaryDto[] = participants.map((p) => {
      const inv = p.investigation;
      const progressList = inv.progress;
      const completedCount = progressList.filter(
        (pr) => pr.status === ChapterProgressStatus.COMPLETED
      ).length;

      const activeProgress = progressList.find(
        (pr) =>
          pr.status === ChapterProgressStatus.IN_PROGRESS ||
          pr.status === ChapterProgressStatus.UNLOCKED
      );

      const currentChapterOrder = activeProgress
        ? activeProgress.chapter.chapterOrder
        : progressList.length > 0
          ? progressList[progressList.length - 1].chapter.chapterOrder
          : 1;

      return {
        id: inv.id,
        caseId: inv.case.id,
        caseCode: inv.case.caseCode,
        caseTitle: inv.case.title,
        difficulty: inv.case.difficulty,
        estimatedDurationMinutes: inv.case.estimatedDurationMinutes,
        status: inv.status,
        playMode: inv.playMode,
        startedAt: inv.startedAt.toISOString(),
        completedAt: inv.completedAt ? inv.completedAt.toISOString() : null,
        lastActiveAt: inv.updatedAt.toISOString(),
        currentChapterOrder,
        totalChapters: progressList.length,
        completedChaptersCount: completedCount,
        participantCount: inv._count.participants,
      };
    });

    return {
      items,
      total,
      page,
      limit,
      totalPages,
      hasMore: page < totalPages,
    };
  }

  /**
   * Executes a validated status transition for an investigation session.
   * State Machine Rules:
   * - PAUSE: IN_PROGRESS -> PAUSED
   * - RESUME: PAUSED | NOT_STARTED -> IN_PROGRESS
   * - ABANDON: NOT_STARTED | IN_PROGRESS | PAUSED -> ABANDONED
   * - COMPLETE: IN_PROGRESS -> SOLVED (only when all chapters are COMPLETED)
   */
  public static async transitionStatus(
    userId: string,
    investigationId: string,
    action: "PAUSE" | "RESUME" | "ABANDON" | "COMPLETE"
  ): Promise<SafeInvestigationWorkspaceDto> {
    const playerId = await this.getPlayerProfileId(userId);

    const trimmedId = investigationId.trim();
    if (!trimmedId || !UUID_REGEX.test(trimmedId)) {
      throw new AppError("Invalid investigation session ID", 400, "INVALID_INVESTIGATION_ID");
    }

    const investigation = await this.fetchInvestigationWithDetails(trimmedId, playerId);

    if (!investigation || investigation.participants.length === 0) {
      throw new AppError(
        "Investigation session not found or restricted",
        404,
        "INVESTIGATION_NOT_FOUND"
      );
    }

    const currentStatus = investigation.status;
    let targetStatus: InvestigationStatus;
    let completedAt: Date | null = null;

    switch (action) {
      case "PAUSE":
        if (currentStatus === InvestigationStatus.PAUSED) {
          // Idempotent
          return this.buildWorkspace(investigation);
        }
        if (currentStatus !== InvestigationStatus.IN_PROGRESS) {
          throw new AppError(
            `Cannot pause investigation in '${currentStatus}' status. Only active investigations can be paused.`,
            400,
            "INVALID_STATUS_TRANSITION"
          );
        }
        targetStatus = InvestigationStatus.PAUSED;
        break;

      case "RESUME":
        if (currentStatus === InvestigationStatus.IN_PROGRESS) {
          // Idempotent
          return this.buildWorkspace(investigation);
        }
        if (
          currentStatus !== InvestigationStatus.PAUSED &&
          currentStatus !== InvestigationStatus.NOT_STARTED
        ) {
          throw new AppError(
            `Cannot resume investigation in '${currentStatus}' status.`,
            400,
            "INVALID_STATUS_TRANSITION"
          );
        }
        targetStatus = InvestigationStatus.IN_PROGRESS;
        break;

      case "ABANDON":
        if (currentStatus === InvestigationStatus.ABANDONED) {
          // Idempotent
          return this.buildWorkspace(investigation);
        }
        if (
          currentStatus === InvestigationStatus.SOLVED ||
          currentStatus === InvestigationStatus.FAILED
        ) {
          throw new AppError(
            `Cannot abandon an investigation that is already concluded (${currentStatus}).`,
            400,
            "INVALID_STATUS_TRANSITION"
          );
        }
        targetStatus = InvestigationStatus.ABANDONED;
        break;

      case "COMPLETE":
        if (currentStatus === InvestigationStatus.SOLVED) {
          // Idempotent
          return this.buildWorkspace(investigation);
        }
        if (currentStatus !== InvestigationStatus.IN_PROGRESS) {
          throw new AppError(
            `Cannot complete investigation in '${currentStatus}' status. Must be actively in progress.`,
            400,
            "INVALID_STATUS_TRANSITION"
          );
        }

        // Verify all chapter progress records are COMPLETED
        const incomplete = investigation.progress.some(
          (pr: any) => pr.status !== ChapterProgressStatus.COMPLETED
        );
        if (incomplete) {
          throw new AppError(
            "Cannot conclude investigation: unresolved tactical acts or chapters remain.",
            400,
            "INCOMPLETE_CHAPTERS"
          );
        }

        targetStatus = InvestigationStatus.SOLVED;
        completedAt = new Date();
        break;

      default:
        throw new AppError("Unsupported lifecycle action", 400, "INVALID_ACTION");
    }

    const updated = await prisma.investigation.update({
      where: { id: trimmedId },
      data: {
        status: targetStatus,
        ...(completedAt && { completedAt }),
        updatedAt: new Date(),
      },
    });

    investigation.status = targetStatus;
    investigation.completedAt = completedAt;
    investigation.updatedAt = updated.updatedAt;

    logger.info("Investigation lifecycle status transitioned", {
      investigationId: trimmedId,
      playerId,
      fromStatus: currentStatus,
      toStatus: targetStatus,
      action,
    });

    return this.buildWorkspace(investigation);
  }

  /**
   * Updates chapter progression within an active investigation.
   * Marking a chapter complete automatically unlocks the next chapter in sequential order.
   */
  public static async updateChapterProgress(
    userId: string,
    investigationId: string,
    chapterId: string,
    action: "START_CHAPTER" | "COMPLETE_CHAPTER"
  ): Promise<SafeInvestigationWorkspaceDto> {
    const playerId = await this.getPlayerProfileId(userId);

    const trimmedId = investigationId.trim();
    if (!trimmedId || !UUID_REGEX.test(trimmedId)) {
      throw new AppError("Invalid investigation session ID", 400, "INVALID_INVESTIGATION_ID");
    }

    const investigation = await this.fetchInvestigationWithDetails(trimmedId, playerId);

    if (!investigation || investigation.participants.length === 0) {
      throw new AppError(
        "Investigation session not found or restricted",
        404,
        "INVESTIGATION_NOT_FOUND"
      );
    }

    if (investigation.status !== InvestigationStatus.IN_PROGRESS) {
      throw new AppError(
        `Cannot update chapter progress while investigation is '${investigation.status}'. Resume the investigation first.`,
        400,
        "INVESTIGATION_NOT_ACTIVE"
      );
    }

    const currentProgress = investigation.progress.find((p: any) => p.chapterId === chapterId);
    if (!currentProgress) {
      throw new AppError(
        "Chapter progression record not found in this investigation",
        404,
        "CHAPTER_NOT_FOUND"
      );
    }

    if (action === "START_CHAPTER") {
      if (currentProgress.status === ChapterProgressStatus.LOCKED) {
        throw new AppError(
          "Cannot start locked chapter. Complete preceding acts first.",
          400,
          "CHAPTER_LOCKED"
        );
      }

      if (currentProgress.status === ChapterProgressStatus.UNLOCKED) {
        await prisma.investigationProgress.update({
          where: { id: currentProgress.id },
          data: {
            status: ChapterProgressStatus.IN_PROGRESS,
            unlockedAt: currentProgress.unlockedAt ?? new Date(),
          },
        });
        currentProgress.status = ChapterProgressStatus.IN_PROGRESS;
      }
    } else if (action === "COMPLETE_CHAPTER") {
      if (currentProgress.status === ChapterProgressStatus.LOCKED) {
        throw new AppError("Cannot complete a locked chapter.", 400, "CHAPTER_LOCKED");
      }

      const now = new Date();
      // Mark current chapter complete
      await prisma.investigationProgress.update({
        where: { id: currentProgress.id },
        data: {
          status: ChapterProgressStatus.COMPLETED,
          completedAt: now,
        },
      });
      currentProgress.status = ChapterProgressStatus.COMPLETED;
      currentProgress.completedAt = now;

      // Unlock next chapter in sequence if one exists
      const nextProgress = investigation.progress.find(
        (p: any) => p.chapter.chapterOrder === currentProgress.chapter.chapterOrder + 1
      );

      if (nextProgress && nextProgress.status === ChapterProgressStatus.LOCKED) {
        await prisma.investigationProgress.update({
          where: { id: nextProgress.id },
          data: {
            status: ChapterProgressStatus.UNLOCKED,
            unlockedAt: now,
          },
        });
        nextProgress.status = ChapterProgressStatus.UNLOCKED;
        nextProgress.unlockedAt = now;

        logger.info("Next chapter unlocked in investigation", {
          investigationId: trimmedId,
          unlockedChapterOrder: nextProgress.chapter.chapterOrder,
        });
      }
    }

    const updated = await prisma.investigation.update({
      where: { id: trimmedId },
      data: { updatedAt: new Date() },
    });
    investigation.updatedAt = updated.updatedAt;

    return this.buildWorkspace(investigation);
  }
}
