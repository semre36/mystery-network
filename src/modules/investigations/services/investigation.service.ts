import { prisma } from "@/server/infrastructure/database";
import {
  ContentStatus,
  InvestigationStatus,
  ParticipantStatus,
  ChapterProgressStatus,
  PlayMode,
  MembershipStatus,
} from "@prisma/client";
import { AppError } from "@/lib/errors/app-error";
import { logger } from "@/lib/logger";
import { TeamGuard } from "@/modules/teams/guards/team.guard";
import type {
  SafeInvestigationSummaryDto,
  SafeInvestigationWorkspaceDto,
  SafeInvestigationChapterProgressDto,
  InvestigationQueryFilters,
} from "../types/investigation.types";
import { EvidenceService } from "@/modules/evidence/services/evidence.service";
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
   * Internal helper to fetch an investigation with full details.
   */
  private static async fetchInvestigationWithDetails(investigationId: string) {
    return prisma.investigation.findUnique({
      where: { id: investigationId },
      include: {
        team: {
          select: {
            id: true,
            name: true,
            inviteCode: true,
          },
        },
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
          include: {
            player: {
              select: {
                id: true,
                codename: true,
                displayName: true,
                avatarUrl: true,
              },
            },
          },
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
  private static buildWorkspace(
    investigation: any,
    playerId?: string,
    isTeamMember: boolean = false
  ): SafeInvestigationWorkspaceDto {
    const myParticipant = playerId
      ? investigation.participants.find(
          (p: any) => p.playerId === playerId && p.status === ParticipantStatus.ACTIVE
        )
      : investigation.participants[0];

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

    const safeCharacters: SafeCharacterDto[] = (c.characters ?? []).map((char: any) => {
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

    const safeParticipants = (investigation.participants ?? []).map((p: any) => ({
      id: p.id,
      playerId: p.playerId,
      codename: p.player?.codename ?? "Unknown Operative",
      displayName: p.player?.displayName ?? "Operative",
      avatarUrl: p.player?.avatarUrl ?? null,
      status: p.status,
      joinedAt: p.joinedAt instanceof Date ? p.joinedAt.toISOString() : p.joinedAt,
    }));

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
      myParticipantStatus: myParticipant ? myParticipant.status : null,
      team: investigation.team
        ? {
            id: investigation.team.id,
            name: investigation.team.name,
            teamCode: investigation.team.inviteCode,
            isMember: isTeamMember,
          }
        : null,
      participants: safeParticipants,
    };
  }

  /**
   * Starts or resumes an investigation for an accessible published case.
   * Supports both solo and cooperative squad operations.
   * Concurrency-safe: Reuses existing active or paused sessions to prevent accidental duplicates.
   */
  public static async startInvestigation(
    userId: string,
    caseIdentifier: string,
    options?: {
      teamId?: string;
      participantPlayerIds?: string[];
    }
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

    // Branch 1: Cooperative Squad Investigation
    if (options?.teamId) {
      const teamId = options.teamId.trim();
      await TeamGuard.requireTeamLeader(teamId, playerId);

      // Determine active squad members to enroll
      const activeMembers = await prisma.teamMembership.findMany({
        where: {
          teamId,
          status: MembershipStatus.ACTIVE,
        },
        select: { playerId: true },
      });

      let targetParticipantIds: string[];
      if (options.participantPlayerIds && options.participantPlayerIds.length > 0) {
        const allowedMemberIds = new Set(activeMembers.map((m) => m.playerId));
        const filtered = options.participantPlayerIds.filter((id) => allowedMemberIds.has(id));
        targetParticipantIds = Array.from(new Set([playerId, ...filtered]));
      } else {
        targetParticipantIds = activeMembers.map((m) => m.playerId);
        if (!targetParticipantIds.includes(playerId)) {
          targetParticipantIds.push(playerId);
        }
      }

      return await prisma.$transaction(async (tx) => {
        // Concurrency lock scoped to team + case
        if (typeof tx.$executeRaw === "function") {
          await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${teamId}), hashtext(${caseRecord.id}))`;
        }

        // Check for existing non-terminal cooperative investigation for this squad & case
        const existingInvestigation = await tx.investigation.findFirst({
          where: {
            caseId: caseRecord.id,
            teamId,
            playMode: PlayMode.COOPERATIVE,
            status: {
              in: [
                InvestigationStatus.IN_PROGRESS,
                InvestigationStatus.PAUSED,
                InvestigationStatus.NOT_STARTED,
              ],
            },
          },
          include: {
            participants: true,
          },
        });

        if (existingInvestigation) {
          if (
            existingInvestigation.status === InvestigationStatus.PAUSED ||
            existingInvestigation.status === InvestigationStatus.NOT_STARTED
          ) {
            await tx.investigation.update({
              where: { id: existingInvestigation.id },
              data: {
                status: InvestigationStatus.IN_PROGRESS,
                startedAt:
                  existingInvestigation.status === InvestigationStatus.NOT_STARTED
                    ? new Date()
                    : existingInvestigation.startedAt,
                updatedAt: new Date(),
              },
            });

            logger.info("Resumed paused squad investigation", {
              investigationId: existingInvestigation.id,
              teamId,
              caseCode: caseRecord.caseCode,
            });
          }

          // Ensure caller and specified participants are enrolled
          for (const pid of targetParticipantIds) {
            const hasParticipant = existingInvestigation.participants.some(
              (p) => p.playerId === pid && p.status === ParticipantStatus.ACTIVE
            );
            if (!hasParticipant) {
              await tx.investigationParticipant.upsert({
                where: {
                  investigationId_playerId: {
                    investigationId: existingInvestigation.id,
                    playerId: pid,
                  },
                },
                create: {
                  investigationId: existingInvestigation.id,
                  playerId: pid,
                  status: ParticipantStatus.ACTIVE,
                  joinedAt: new Date(),
                },
                update: {
                  status: ParticipantStatus.ACTIVE,
                },
              });
            }
          }

          return {
            investigationId: existingInvestigation.id,
            wasResumed: true,
          };
        }

        // Initialize new cooperative investigation
        const newInvestigation = await tx.investigation.create({
          data: {
            caseId: caseRecord.id,
            teamId,
            status: InvestigationStatus.IN_PROGRESS,
            playMode: PlayMode.COOPERATIVE,
            startedAt: new Date(),
          },
        });

        // Register initial participants
        await tx.investigationParticipant.createMany({
          data: targetParticipantIds.map((pId) => ({
            investigationId: newInvestigation.id,
            playerId: pId,
            status: ParticipantStatus.ACTIVE,
            joinedAt: new Date(),
          })),
        });

        // Initialize chapter progression
        if (caseRecord.chapters.length > 0) {
          const sortedChapters = [...caseRecord.chapters].sort(
            (a, b) => a.chapterOrder - b.chapterOrder
          );
          const firstChapterId = sortedChapters[0].id;

          const progressEntries = sortedChapters.map((chapter) => ({
            investigationId: newInvestigation.id,
            chapterId: chapter.id,
            status:
              chapter.id === firstChapterId
                ? ChapterProgressStatus.IN_PROGRESS
                : ChapterProgressStatus.LOCKED,
            unlockedAt: chapter.id === firstChapterId ? new Date() : null,
          }));

          await tx.investigationProgress.createMany({
            data: progressEntries,
          });

          // Provision Act 1 evidence for squad participants
          if (typeof (tx as any).clue?.findMany === "function") {
            await EvidenceService.provisionInvestigationClues(
              tx,
              newInvestigation.id,
              caseRecord.id,
              firstChapterId,
              targetParticipantIds
            );
          }
        }

        logger.info("Initialized new squad investigation session", {
          investigationId: newInvestigation.id,
          teamId,
          caseCode: caseRecord.caseCode,
          participantCount: targetParticipantIds.length,
        });

        return {
          investigationId: newInvestigation.id,
          wasResumed: false,
        };
      });
    }

    // Branch 2: Solo Investigation
    // Execute atomic session creation or reuse in an interactive transaction
    return await prisma.$transaction(async (tx) => {
      // Concurrency lock: Acquire transactional advisory lock scoped to (playerId, caseRecord.id).
      if (typeof tx.$executeRaw === "function") {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${playerId}), hashtext(${caseRecord.id}))`;
      }

      // 1. Check for an existing non-terminal solo investigation for this player & case
      const existingParticipant = await tx.investigationParticipant.findFirst({
        where: {
          playerId,
          status: ParticipantStatus.ACTIVE,
          investigation: {
            caseId: caseRecord.id,
            playMode: PlayMode.SOLO,
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

      // 4. Initialize chapter progression records (supporting arbitrary/non-consecutive chapterOrder)
      if (caseRecord.chapters.length > 0) {
        const sortedChapters = [...caseRecord.chapters].sort(
          (a, b) => a.chapterOrder - b.chapterOrder
        );
        const firstChapterId = sortedChapters[0].id;

        const progressEntries = sortedChapters.map((chapter) => ({
          investigationId: newInvestigation.id,
          chapterId: chapter.id,
          status:
            chapter.id === firstChapterId
              ? ChapterProgressStatus.IN_PROGRESS
              : ChapterProgressStatus.LOCKED,
          unlockedAt: chapter.id === firstChapterId ? new Date() : null,
        }));

        await tx.investigationProgress.createMany({
          data: progressEntries,
        });

        // 5. Automatically provision initial evidence for Act 1
        if (typeof (tx as any).clue?.findMany === "function") {
          await EvidenceService.provisionInvestigationClues(
            tx,
            newInvestigation.id,
            caseRecord.id,
            firstChapterId,
            [playerId]
          );
        }
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
   * Enforces strict participant / team member authorization and redacts all secret clues/puzzle solutions.
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

    const investigation = await this.fetchInvestigationWithDetails(trimmedId);

    if (!investigation) {
      throw new AppError(
        "Investigation session not found or restricted",
        404,
        "INVESTIGATION_NOT_FOUND"
      );
    }

    // Verify participant authorization or team membership
    const myParticipant = investigation.participants.find(
      (p: any) => p.playerId === playerId && p.status === ParticipantStatus.ACTIVE
    );

    let isTeamMember = false;
    if (investigation.teamId) {
      const membership = await prisma.teamMembership.findUnique({
        where: {
          teamId_playerId: {
            teamId: investigation.teamId,
            playerId,
          },
        },
      });
      if (membership && membership.status === MembershipStatus.ACTIVE) {
        isTeamMember = true;
      }
    }

    if (!myParticipant && !isTeamMember) {
      throw new AppError(
        "Access denied: You are not an active operative in this investigation",
        404,
        "INVESTIGATION_NOT_FOUND"
      );
    }

    return this.buildWorkspace(investigation, playerId, isTeamMember);
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
    action: "PAUSE" | "RESUME" | "ABANDON" | "COMPLETE" | "FAIL"
  ): Promise<SafeInvestigationWorkspaceDto> {
    const playerId = await this.getPlayerProfileId(userId);

    const trimmedId = investigationId.trim();
    if (!trimmedId || !UUID_REGEX.test(trimmedId)) {
      throw new AppError("Invalid investigation session ID", 400, "INVALID_INVESTIGATION_ID");
    }

    const investigation = await this.fetchInvestigationWithDetails(trimmedId);

    const isParticipant =
      investigation &&
      investigation.participants.some(
        (p: any) => p.playerId === playerId && p.status === ParticipantStatus.ACTIVE
      );

    if (!investigation || !isParticipant) {
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
          return this.buildWorkspace(investigation, playerId);
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
          return this.buildWorkspace(investigation, playerId);
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
          return this.buildWorkspace(investigation, playerId);
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
          return this.buildWorkspace(investigation, playerId);
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

      case "FAIL":
        if (currentStatus === InvestigationStatus.FAILED) {
          // Idempotent
          return this.buildWorkspace(investigation, playerId);
        }
        if (
          currentStatus === InvestigationStatus.SOLVED ||
          currentStatus === InvestigationStatus.ABANDONED
        ) {
          throw new AppError(
            `Cannot fail an investigation that is already concluded (${currentStatus}).`,
            400,
            "INVALID_STATUS_TRANSITION"
          );
        }
        targetStatus = InvestigationStatus.FAILED;
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

    return this.buildWorkspace(investigation, playerId);
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

    const investigation = await this.fetchInvestigationWithDetails(trimmedId);

    const isParticipant =
      investigation &&
      investigation.participants.some(
        (p: any) => p.playerId === playerId && p.status === ParticipantStatus.ACTIVE
      );

    if (!investigation || !isParticipant) {
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

    if (currentProgress.status === ChapterProgressStatus.COMPLETED) {
      throw new AppError("Chapter has already been completed.", 400, "CHAPTER_ALREADY_COMPLETED");
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
        throw new AppError(
          "Cannot complete a locked chapter. Unlock and start it first.",
          400,
          "CHAPTER_LOCKED"
        );
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

      // Unlock next chapter in sequence if one exists (supports arbitrary / non-consecutive chapterOrder)
      const subsequentProgress = investigation.progress
        .filter((p: any) => p.chapter.chapterOrder > currentProgress.chapter.chapterOrder)
        .sort((a: any, b: any) => a.chapter.chapterOrder - b.chapter.chapterOrder);

      const nextProgress = subsequentProgress.length > 0 ? subsequentProgress[0] : null;

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

        // Automatically provision evidence unlocked for this subsequent chapter
        if (typeof prisma.clue?.findMany === "function") {
          await EvidenceService.provisionInvestigationClues(
            prisma,
            trimmedId,
            investigation.case.id,
            nextProgress.chapterId
          );
        }
      }
    }

    const updated = await prisma.investigation.update({
      where: { id: trimmedId },
      data: { updatedAt: new Date() },
    });
    investigation.updatedAt = updated.updatedAt;

    return this.buildWorkspace(investigation, playerId);
  }

  /**
   * Enrolls an authenticated active squad member into an ongoing cooperative investigation.
   * Concurrency-safe: Provisions newly eligible chapter clues without re-provisioning or overwriting
   * existing asymmetric clue allocations.
   */
  public static async joinTeamInvestigation(
    userId: string,
    investigationId: string
  ): Promise<SafeInvestigationWorkspaceDto> {
    const playerId = await this.getPlayerProfileId(userId);

    const trimmedId = investigationId.trim();
    if (!trimmedId || !UUID_REGEX.test(trimmedId)) {
      throw new AppError("Invalid investigation session ID", 400, "INVALID_INVESTIGATION_ID");
    }

    const investigation = await prisma.investigation.findUnique({
      where: { id: trimmedId },
      include: {
        team: true,
        participants: true,
        progress: {
          include: { chapter: true },
          orderBy: { chapter: { chapterOrder: "asc" } },
        },
      },
    });

    if (!investigation) {
      throw new AppError("Investigation session not found", 404, "INVESTIGATION_NOT_FOUND");
    }

    if (!investigation.teamId || investigation.playMode !== PlayMode.COOPERATIVE) {
      throw new AppError(
        "This investigation is not a cooperative squad operation",
        400,
        "NOT_COOPERATIVE_INVESTIGATION"
      );
    }

    if (
      investigation.status === InvestigationStatus.SOLVED ||
      investigation.status === InvestigationStatus.ABANDONED ||
      investigation.status === InvestigationStatus.FAILED
    ) {
      throw new AppError(
        "This investigation has concluded and is no longer accepting new operatives",
        400,
        "INVESTIGATION_CONCLUDED"
      );
    }

    // Verify caller is an active member of the squad
    const membership = await prisma.teamMembership.findUnique({
      where: {
        teamId_playerId: {
          teamId: investigation.teamId,
          playerId,
        },
      },
    });

    if (!membership || membership.status !== MembershipStatus.ACTIVE) {
      throw new AppError(
        "You are not an active operative of the squad conducting this investigation",
        403,
        "NOT_TEAM_MEMBER"
      );
    }

    // Join if not already an active participant
    const isAlreadyActive = investigation.participants.some(
      (p) => p.playerId === playerId && p.status === ParticipantStatus.ACTIVE
    );

    if (!isAlreadyActive) {
      await prisma.$transaction(async (tx) => {
        const existingParticipant = await tx.investigationParticipant.findUnique({
          where: {
            investigationId_playerId: {
              investigationId: trimmedId,
              playerId,
            },
          },
        });

        if (existingParticipant) {
          await tx.investigationParticipant.update({
            where: { id: existingParticipant.id },
            data: { status: ParticipantStatus.ACTIVE },
          });
        } else {
          await tx.investigationParticipant.create({
            data: {
              investigationId: trimmedId,
              playerId,
              status: ParticipantStatus.ACTIVE,
              joinedAt: new Date(),
            },
          });
        }

        // Provision eligible clues for the current chapter
        const activeChapter =
          investigation.progress.find((p) => p.status === ChapterProgressStatus.IN_PROGRESS) ??
          investigation.progress.find((p) => p.status === ChapterProgressStatus.UNLOCKED);

        if (activeChapter && typeof (tx as any).clue?.findMany === "function") {
          await EvidenceService.provisionInvestigationClues(
            tx,
            trimmedId,
            investigation.caseId,
            activeChapter.chapterId,
            [playerId]
          );
        }
      });

      logger.info("Operative joined active squad investigation", {
        investigationId: trimmedId,
        teamId: investigation.teamId,
        playerId,
      });
    }

    return await this.getInvestigationWorkspace(userId, trimmedId);
  }
}
