import { prisma } from "@/server/infrastructure/database";
import { AppError } from "@/lib/errors/app-error";
import { logger } from "@/lib/logger";
import {
  ContentStatus,
  ClueStrategy,
  AssignmentStatus,
  ParticipantStatus,
  ChapterProgressStatus,
  InvestigationStatus,
  MembershipStatus,
} from "@prisma/client";
import {
  SafeEvidenceSummaryDto,
  SafeEvidenceDetailDto,
  SafeEvidenceNoteDto,
  SafeEvidenceShareInfoDto,
  SafeEvidenceAssetDto,
  EvidenceQueryFilters,
  EvidenceAccessType,
} from "../types/evidence.types";
import { StorageService } from "./storage.service";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export class EvidenceService {
  /**
   * Internal helper resolving an authenticated User.id to their PlayerProfile.id
   */
  private static async getPlayerProfileId(userId: string): Promise<string> {
    const profile = await prisma.playerProfile.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!profile) {
      throw new AppError("Active investigator profile required", 404, "PLAYER_PROFILE_NOT_FOUND");
    }

    return profile.id;
  }

  /**
   * Validates participant authorization for an investigation.
   * Defeats ID existence probing by returning uniform HTTP 404 for unauthorized queries.
   */
  public static async verifyInvestigationParticipant(
    investigationId: string,
    playerId: string
  ): Promise<{ investigation: any; participant: any }> {
    if (!UUID_REGEX.test(investigationId)) {
      throw new AppError("Invalid investigation session ID", 400, "INVALID_INVESTIGATION_ID");
    }

    const investigation = await prisma.investigation.findUnique({
      where: { id: investigationId },
      include: {
        case: {
          select: {
            id: true,
            caseCode: true,
            title: true,
          },
        },
        participants: {
          where: { playerId, status: ParticipantStatus.ACTIVE },
        },
        progress: {
          include: {
            chapter: true,
          },
        },
      },
    });

    if (!investigation || investigation.participants.length === 0) {
      throw new AppError(
        "Investigation session not found or restricted",
        404,
        "INVESTIGATION_NOT_FOUND"
      );
    }

    // For ongoing squad investigations, verify operative maintains active squad membership
    if (
      investigation.teamId &&
      (investigation.status === InvestigationStatus.IN_PROGRESS ||
        investigation.status === InvestigationStatus.PAUSED ||
        investigation.status === InvestigationStatus.NOT_STARTED)
    ) {
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
          "Investigation session not found or restricted",
          404,
          "INVESTIGATION_NOT_FOUND"
        );
      }
    }

    return {
      investigation,
      participant: investigation.participants[0],
    };
  }

  /**
   * Automatically provisions clues for an investigation when initiated or when chapters unlock.
   */
  public static async provisionInvestigationClues(
    dbClient: any,
    investigationId: string,
    caseId: string,
    targetChapterId?: string,
    targetPlayerIds?: string[]
  ): Promise<number> {
    // Concurrency lock: Advisory lock scoped to investigationId prevents race conditions
    // during simultaneous participant joins or concurrent chapter transitions
    if (typeof dbClient.$executeRaw === "function") {
      await dbClient.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${investigationId}))`;
    }

    // 1. Resolve published clues for this case and chapter (or case-level)
    const clues = await dbClient.clue.findMany({
      where: {
        caseId,
        status: ContentStatus.PUBLISHED,
        ...(targetChapterId ? { chapterId: targetChapterId } : {}),
      },
      include: {
        chapter: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    if (clues.length === 0) {
      return 0;
    }

    // 2. Resolve target participants
    let playerIds = targetPlayerIds;
    if (!playerIds || playerIds.length === 0) {
      const participants = await dbClient.investigationParticipant.findMany({
        where: { investigationId, status: ParticipantStatus.ACTIVE },
        select: { playerId: true },
      });
      playerIds = participants.map((p: any) => p.playerId);
    }

    if (!playerIds || playerIds.length === 0) {
      return 0;
    }

    let createdCount = 0;

    for (const clue of clues) {
      if (clue.assignmentStrategy === ClueStrategy.ALL_PLAYERS) {
        // Assign to all active participants in the investigation
        for (const pid of playerIds) {
          const existing = await dbClient.clueAssignment.findUnique({
            where: {
              investigationId_clueId_playerId: {
                investigationId,
                clueId: clue.id,
                playerId: pid,
              },
            },
          });

          if (!existing) {
            await dbClient.clueAssignment.create({
              data: {
                investigationId,
                clueId: clue.id,
                playerId: pid,
                status: AssignmentStatus.UNSEEN,
                assignedAt: new Date(),
              },
            });
            createdCount++;
          }
        }
      } else {
        // ASYMMETRIC_EXCLUSIVE, RANDOM, ROLE_BASED
        // Ensure this exclusive clue is not already assigned to ANY operative in this investigation
        const existingInInvestigation = await dbClient.clueAssignment.findFirst({
          where: {
            investigationId,
            clueId: clue.id,
          },
        });

        if (!existingInInvestigation) {
          // Assign to the primary operative in the target list
          const primaryPlayerId = playerIds[0];
          await dbClient.clueAssignment.create({
            data: {
              investigationId,
              clueId: clue.id,
              playerId: primaryPlayerId,
              status: AssignmentStatus.UNSEEN,
              assignedAt: new Date(),
            },
          });
          createdCount++;
        }
      }
    }

    logger.info("Provisioned clues for investigation", {
      investigationId,
      caseId,
      targetChapterId,
      provisionedCount: createdCount,
    });

    return createdCount;
  }

  /**
   * Retrieves all evidence accessible to an authenticated participant in an investigation.
   */
  public static async getInvestigationEvidence(
    userId: string,
    investigationId: string,
    filters: EvidenceQueryFilters = {}
  ): Promise<{
    items: SafeEvidenceSummaryDto[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const playerId = await this.getPlayerProfileId(userId);
    const { investigation } = await this.verifyInvestigationParticipant(investigationId, playerId);

    // Identify unlocked chapter IDs in this investigation
    const unlockedChapterIds = new Set<string>();
    for (const prog of investigation.progress) {
      if (
        prog.status === ChapterProgressStatus.UNLOCKED ||
        prog.status === ChapterProgressStatus.IN_PROGRESS ||
        prog.status === ChapterProgressStatus.COMPLETED
      ) {
        unlockedChapterIds.add(prog.chapterId);
      }
    }

    // 1. Fetch direct assignments for this operative
    const myAssignments = await prisma.clueAssignment.findMany({
      where: {
        investigationId,
        playerId,
      },
      include: {
        clue: {
          include: {
            chapter: true,
            assets: true,
          },
        },
      },
    });

    // 2. Fetch evidence shared with this operative (or shared investigation-wide)
    const myShares = await prisma.evidenceShare.findMany({
      where: {
        investigationId,
        revokedAt: null,
        OR: [{ recipientPlayerId: playerId }, { recipientPlayerId: null }],
      },
      include: {
        clueAssignment: {
          include: {
            clue: {
              include: {
                chapter: true,
                assets: true,
              },
            },
          },
        },
      },
    });

    // 3. Fetch all case-level and unlocked ALL_PLAYERS clues
    const allPlayersClues = await prisma.clue.findMany({
      where: {
        caseId: investigation.caseId,
        status: ContentStatus.PUBLISHED,
        assignmentStrategy: ClueStrategy.ALL_PLAYERS,
        OR: [{ chapterId: null }, { chapterId: { in: Array.from(unlockedChapterIds) } }],
      },
      include: {
        chapter: true,
        assets: true,
      },
    });

    // 4. Fetch personal notes for this operative across this investigation
    const myNotes = await prisma.evidenceNote.findMany({
      where: {
        investigationId,
        playerId,
      },
      select: {
        clueId: true,
      },
    });
    const cluesWithNotes = new Set(myNotes.map((n) => n.clueId));

    // Consolidate unique accessible clues
    const clueMap = new Map<
      string,
      {
        clue: any;
        accessType: EvidenceAccessType;
        assignmentStatus: AssignmentStatus | null;
        discoveredAt: Date;
      }
    >();

    // Direct assignments take primary precedence
    for (const a of myAssignments) {
      const isUnlocked = !a.clue.chapterId || unlockedChapterIds.has(a.clue.chapterId);
      if (a.clue.status === ContentStatus.PUBLISHED && isUnlocked) {
        clueMap.set(a.clueId, {
          clue: a.clue,
          accessType: "ASSIGNED",
          assignmentStatus: a.status,
          discoveredAt: a.assignedAt,
        });
      }
    }

    // Investigation-wide ALL_PLAYERS clues
    for (const c of allPlayersClues) {
      if (!clueMap.has(c.id)) {
        clueMap.set(c.id, {
          clue: c,
          accessType: "INVESTIGATION_WIDE",
          assignmentStatus: AssignmentStatus.VIEWED,
          discoveredAt: c.createdAt,
        });
      }
    }

    // Shared clues
    for (const s of myShares) {
      const c = s.clueAssignment.clue;
      const isUnlocked = !c.chapterId || unlockedChapterIds.has(c.chapterId);
      if (c.status === ContentStatus.PUBLISHED && isUnlocked) {
        if (!clueMap.has(c.id)) {
          clueMap.set(c.id, {
            clue: c,
            accessType: "SHARED",
            assignmentStatus: AssignmentStatus.VIEWED,
            discoveredAt: s.sharedAt,
          });
        }
      }
    }

    // Convert map to array and apply filters
    let results = Array.from(clueMap.values());

    if (filters.type) {
      results = results.filter((item) => item.clue.clueType === filters.type);
    }

    if (filters.chapterId) {
      results = results.filter((item) => item.clue.chapterId === filters.chapterId);
    }

    if (filters.scope && filters.scope !== "ALL") {
      results = results.filter((item) => item.accessType === filters.scope);
    }

    if (filters.search) {
      const q = filters.search.toLowerCase();
      results = results.filter(
        (item) =>
          item.clue.title.toLowerCase().includes(q) ||
          item.clue.description.toLowerCase().includes(q) ||
          (item.clue.clueCode && item.clue.clueCode.toLowerCase().includes(q))
      );
    }

    // Sort by discovery date descending
    results.sort((a, b) => b.discoveredAt.getTime() - a.discoveredAt.getTime());

    const total = results.length;
    const page = Math.max(1, filters.page ?? 1);
    const limit = Math.min(50, Math.max(1, filters.limit ?? 20));
    const skip = (page - 1) * limit;
    const paginated = results.slice(skip, skip + limit);

    const items: SafeEvidenceSummaryDto[] = paginated.map((item) => {
      const meta =
        item.clue.visibilityConfig && typeof item.clue.visibilityConfig === "object"
          ? (item.clue.visibilityConfig as Record<string, unknown>)
          : {};

      const classification =
        typeof meta.classification === "string" ? meta.classification : "RESTRICTED";

      return {
        id: item.clue.id,
        clueCode: item.clue.clueCode ?? `CLUE-${item.clue.id.substring(0, 6).toUpperCase()}`,
        title: item.clue.title,
        description: item.clue.description,
        clueType: item.clue.clueType,
        classification,
        isShareable: item.clue.isShareable,
        chapterId: item.clue.chapterId,
        chapterTitle: item.clue.chapter ? item.clue.chapter.title : null,
        chapterOrder: item.clue.chapter ? item.clue.chapter.chapterOrder : null,
        accessType: item.accessType,
        assignmentStatus: item.assignmentStatus,
        discoveredAt: item.discoveredAt.toISOString(),
        hasNote: cluesWithNotes.has(item.clue.id),
        assetsCount: item.clue.assets ? item.clue.assets.length : 0,
      };
    });

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * Inspects detailed intelligence for a single evidence item.
   * Enforces server-side access control, marks UNSEEN clues as VIEWED,
   * and loads private notes & share records.
   */
  public static async getEvidenceDetail(
    userId: string,
    investigationId: string,
    clueId: string
  ): Promise<SafeEvidenceDetailDto> {
    const playerId = await this.getPlayerProfileId(userId);
    const { investigation } = await this.verifyInvestigationParticipant(investigationId, playerId);

    if (!UUID_REGEX.test(clueId)) {
      throw new AppError("Invalid evidence identifier", 400, "INVALID_EVIDENCE_ID");
    }

    // 1. Fetch clue definition
    const clue = await prisma.clue.findUnique({
      where: { id: clueId },
      include: {
        chapter: true,
        assets: true,
      },
    });

    if (!clue || clue.caseId !== investigation.caseId || clue.status !== ContentStatus.PUBLISHED) {
      throw new AppError("Evidence record not found or restricted", 404, "EVIDENCE_NOT_FOUND");
    }

    // 2. Verify chapter unlock status
    if (clue.chapterId) {
      const chapterProg = investigation.progress.find((p: any) => p.chapterId === clue.chapterId);
      if (
        !chapterProg ||
        (chapterProg.status !== ChapterProgressStatus.UNLOCKED &&
          chapterProg.status !== ChapterProgressStatus.IN_PROGRESS &&
          chapterProg.status !== ChapterProgressStatus.COMPLETED)
      ) {
        throw new AppError("Evidence record not found or restricted", 404, "EVIDENCE_NOT_FOUND");
      }
    }

    // 3. Check access rights
    let accessType: EvidenceAccessType | null = null;
    let assignmentStatus: AssignmentStatus | null = null;
    let discoveredAt = clue.createdAt;

    // Check direct assignment
    const directAssignment = await prisma.clueAssignment.findUnique({
      where: {
        investigationId_clueId_playerId: {
          investigationId,
          clueId,
          playerId,
        },
      },
    });

    if (directAssignment) {
      accessType = "ASSIGNED";
      assignmentStatus = directAssignment.status;
      discoveredAt = directAssignment.assignedAt;

      // Mark as VIEWED if previously UNSEEN
      if (directAssignment.status === AssignmentStatus.UNSEEN) {
        await prisma.clueAssignment.update({
          where: { id: directAssignment.id },
          data: {
            status: AssignmentStatus.VIEWED,
            viewedAt: new Date(),
          },
        });
        assignmentStatus = AssignmentStatus.VIEWED;
      }
    } else if (clue.assignmentStrategy === ClueStrategy.ALL_PLAYERS) {
      accessType = "INVESTIGATION_WIDE";
      assignmentStatus = AssignmentStatus.VIEWED;
    } else {
      // Check if shared with this operative
      const activeShare = await prisma.evidenceShare.findFirst({
        where: {
          investigationId,
          clueAssignment: { clueId },
          revokedAt: null,
          OR: [{ recipientPlayerId: playerId }, { recipientPlayerId: null }],
        },
      });

      if (activeShare) {
        accessType = "SHARED";
        assignmentStatus = AssignmentStatus.VIEWED;
        discoveredAt = activeShare.sharedAt;
      }
    }

    if (!accessType) {
      // Uniform 404 to prevent ID existence enumeration
      throw new AppError("Evidence record not found or restricted", 404, "EVIDENCE_NOT_FOUND");
    }

    // 4. Fetch private note for this operative
    const privateNote = await prisma.evidenceNote.findUnique({
      where: {
        investigationId_clueId_playerId: {
          investigationId,
          clueId,
          playerId,
        },
      },
    });

    const myNote: SafeEvidenceNoteDto | null = privateNote
      ? {
          id: privateNote.id,
          content: privateNote.content,
          updatedAt: privateNote.updatedAt.toISOString(),
        }
      : null;

    // 5. Fetch share history for this clue in this investigation
    const shares = await prisma.evidenceShare.findMany({
      where: {
        investigationId,
        clueAssignment: { clueId },
        revokedAt: null,
      },
      include: {
        sharingPlayer: { select: { codename: true } },
        recipientPlayer: { select: { codename: true } },
      },
      orderBy: { sharedAt: "desc" },
    });

    const safeShares: SafeEvidenceShareInfoDto[] = shares.map((s) => ({
      id: s.id,
      sharedAt: s.sharedAt.toISOString(),
      sharingPlayerCodename: s.sharingPlayer.codename,
      recipientPlayerCodename: s.recipientPlayer ? s.recipientPlayer.codename : "All Operatives",
      isMine: s.sharingPlayerId === playerId,
    }));

    // 6. Find eligible recipients for sharing
    const allParticipants = await prisma.investigationParticipant.findMany({
      where: {
        investigationId,
        status: ParticipantStatus.ACTIVE,
        playerId: { not: playerId },
      },
      include: {
        player: {
          select: {
            id: true,
            codename: true,
            displayName: true,
          },
        },
      },
    });

    const eligibleRecipients = allParticipants.map((p) => ({
      id: p.player.id,
      codename: p.player.codename,
      displayName: p.player.displayName,
    }));

    const meta =
      clue.visibilityConfig && typeof clue.visibilityConfig === "object"
        ? (clue.visibilityConfig as Record<string, unknown>)
        : {};

    const classification =
      typeof meta.classification === "string" ? meta.classification : "RESTRICTED";

    const assets: SafeEvidenceAssetDto[] = clue.assets.map((asset) => ({
      id: asset.id,
      assetType: asset.assetType,
      fileName: asset.fileName,
      mimeType: asset.mimeType,
      fileSizeBytes: Number(asset.fileSizeBytes),
      downloadUrl: StorageService.getSecureAccessUrl(investigationId, clue.id, asset.id),
      metadata:
        asset.metadata && typeof asset.metadata === "object"
          ? (asset.metadata as Record<string, unknown>)
          : undefined,
    }));

    return {
      id: clue.id,
      clueCode: clue.clueCode ?? `CLUE-${clue.id.substring(0, 6).toUpperCase()}`,
      title: clue.title,
      description: clue.description,
      clueType: clue.clueType,
      classification,
      isShareable: clue.isShareable,
      chapterId: clue.chapterId,
      chapterTitle: clue.chapter ? clue.chapter.title : null,
      chapterOrder: clue.chapter ? clue.chapter.chapterOrder : null,
      accessType,
      assignmentStatus,
      discoveredAt: discoveredAt.toISOString(),
      hasNote: myNote !== null,
      assetsCount: assets.length,
      content:
        clue.content && typeof clue.content === "object"
          ? (clue.content as Record<string, unknown>)
          : {},
      assets,
      myNote,
      shares: safeShares,
      eligibleRecipients,
    };
  }

  /**
   * Creates or updates a private note on an evidence record.
   * Strictly isolated to the authenticated operative and current investigation.
   */
  public static async saveEvidenceNote(
    userId: string,
    investigationId: string,
    clueId: string,
    content: string
  ): Promise<SafeEvidenceNoteDto> {
    const playerId = await this.getPlayerProfileId(userId);

    // Verify access to this evidence first
    await this.getEvidenceDetail(userId, investigationId, clueId);

    const trimmedContent = content.trim();
    if (!trimmedContent) {
      throw new AppError("Note content cannot be empty", 400, "INVALID_NOTE_CONTENT");
    }

    if (trimmedContent.length > 2000) {
      throw new AppError(
        "Note content exceeds the 2,000 character maximum limit",
        400,
        "NOTE_TOO_LONG"
      );
    }

    const note = await prisma.evidenceNote.upsert({
      where: {
        investigationId_clueId_playerId: {
          investigationId,
          clueId,
          playerId,
        },
      },
      create: {
        investigationId,
        clueId,
        playerId,
        content: trimmedContent,
      },
      update: {
        content: trimmedContent,
      },
    });

    logger.info("Saved private evidence note", {
      investigationId,
      clueId,
      playerId,
      noteId: note.id,
    });

    return {
      id: note.id,
      content: note.content,
      updatedAt: note.updatedAt.toISOString(),
    };
  }

  /**
   * Deletes a private note on an evidence record.
   * Strictly isolated to the authenticated operative and current investigation.
   */
  public static async deleteEvidenceNote(
    userId: string,
    investigationId: string,
    clueId: string
  ): Promise<void> {
    const playerId = await this.getPlayerProfileId(userId);
    await this.getEvidenceDetail(userId, investigationId, clueId);

    const existing = await prisma.evidenceNote.findUnique({
      where: {
        investigationId_clueId_playerId: {
          investigationId,
          clueId,
          playerId,
        },
      },
    });

    if (!existing) {
      throw new AppError("Evidence note not found", 404, "NOTE_NOT_FOUND");
    }

    await prisma.evidenceNote.delete({
      where: { id: existing.id },
    });

    logger.info("Deleted private evidence note", {
      investigationId,
      clueId,
      playerId,
      noteId: existing.id,
    });
  }

  /**
   * Explicitly shares eligible evidence with another participant in the same investigation.
   * Requires that the sender has direct access (ASSIGNED or INVESTIGATION_WIDE) and
   * runs in a concurrency-safe transaction to prevent duplicate active shares.
   */
  public static async shareEvidence(
    userId: string,
    investigationId: string,
    clueId: string,
    recipientPlayerId?: string
  ): Promise<SafeEvidenceShareInfoDto> {
    const playerId = await this.getPlayerProfileId(userId);
    const detail = await this.getEvidenceDetail(userId, investigationId, clueId);

    if (!detail.isShareable) {
      throw new AppError(
        "This classified evidence is marked non-shareable by intelligence protocol",
        400,
        "EVIDENCE_NOT_SHAREABLE"
      );
    }

    // AUDIT: Sender must have direct access (ASSIGNED or INVESTIGATION_WIDE).
    // Operatives who received evidence via a share cannot re-share it.
    if (detail.accessType === "SHARED") {
      throw new AppError(
        "Only operatives with direct assignment or clearance may share this intelligence",
        403,
        "DIRECT_ACCESS_REQUIRED"
      );
    }

    if (recipientPlayerId) {
      if (recipientPlayerId === playerId) {
        throw new AppError("Cannot share evidence with yourself", 400, "INVALID_RECIPIENT");
      }

      // Verify recipient is an active participant in the same investigation
      const recipientParticipant = await prisma.investigationParticipant.findFirst({
        where: {
          investigationId,
          playerId: recipientPlayerId,
          status: ParticipantStatus.ACTIVE,
        },
        include: {
          player: { select: { codename: true } },
        },
      });

      if (!recipientParticipant) {
        throw new AppError(
          "Recipient is not an active operative in this investigation",
          400,
          "RECIPIENT_NOT_IN_INVESTIGATION"
        );
      }
    }

    // Execute duplicate check, anchor assignment, and share creation inside an interactive transaction
    return await prisma.$transaction(async (tx) => {
      if (recipientPlayerId) {
        const existingShare = await tx.evidenceShare.findFirst({
          where: {
            investigationId,
            clueAssignment: { clueId },
            recipientPlayerId,
            revokedAt: null,
          },
        });

        if (existingShare) {
          throw new AppError(
            "This intelligence has already been shared with this operative",
            400,
            "DUPLICATE_SHARE"
          );
        }
      }

      // Ensure sender has a ClueAssignment record to anchor the share
      let assignment = await tx.clueAssignment.findUnique({
        where: {
          investigationId_clueId_playerId: {
            investigationId,
            clueId,
            playerId,
          },
        },
      });

      if (!assignment) {
        assignment = await tx.clueAssignment.create({
          data: {
            investigationId,
            clueId,
            playerId,
            status: AssignmentStatus.SHARED,
            assignedAt: new Date(),
          },
        });
      }

      const share = await tx.evidenceShare.create({
        data: {
          investigationId,
          clueAssignmentId: assignment.id,
          sharingPlayerId: playerId,
          recipientPlayerId: recipientPlayerId ?? null,
          sharedAt: new Date(),
        },
        include: {
          sharingPlayer: { select: { codename: true } },
          recipientPlayer: { select: { codename: true } },
        },
      });

      // Update assignment status to SHARED
      await tx.clueAssignment.update({
        where: { id: assignment.id },
        data: { status: AssignmentStatus.SHARED },
      });

      logger.info("Evidence shared successfully", {
        investigationId,
        clueId,
        sharingPlayerId: playerId,
        recipientPlayerId,
        shareId: share.id,
      });

      return {
        id: share.id,
        sharedAt: share.sharedAt.toISOString(),
        sharingPlayerCodename: share.sharingPlayer.codename,
        recipientPlayerCodename: share.recipientPlayer
          ? share.recipientPlayer.codename
          : "All Operatives",
        isMine: true,
      };
    });
  }

  /**
   * Revokes an active evidence share.
   * Only the sharing operative may revoke their transmission.
   */
  public static async revokeEvidenceShare(
    userId: string,
    investigationId: string,
    shareId: string
  ): Promise<void> {
    const playerId = await this.getPlayerProfileId(userId);
    await this.verifyInvestigationParticipant(investigationId, playerId);

    if (!UUID_REGEX.test(shareId)) {
      throw new AppError("Invalid share identifier", 400, "INVALID_SHARE_ID");
    }

    const share = await prisma.evidenceShare.findUnique({
      where: { id: shareId },
    });

    if (!share || share.investigationId !== investigationId) {
      throw new AppError("Evidence share record not found", 404, "SHARE_NOT_FOUND");
    }

    if (share.sharingPlayerId !== playerId) {
      throw new AppError(
        "Only the operative who shared this intelligence may revoke it",
        403,
        "FORBIDDEN"
      );
    }

    if (share.revokedAt) {
      throw new AppError("Evidence share is already revoked", 400, "SHARE_ALREADY_REVOKED");
    }

    await prisma.evidenceShare.update({
      where: { id: shareId },
      data: { revokedAt: new Date() },
    });

    logger.info("Evidence share revoked", {
      investigationId,
      shareId,
      revokingPlayerId: playerId,
    });
  }

  /**
   * Verifies access and retrieves metadata for a specific evidence asset.
   */
  public static async getEvidenceAsset(
    userId: string,
    investigationId: string,
    clueId: string,
    assetId: string
  ): Promise<{
    asset: any;
  }> {
    // Verifies user is in investigation and has access to this clue and chapter is unlocked
    await this.getEvidenceDetail(userId, investigationId, clueId);

    if (!UUID_REGEX.test(assetId)) {
      throw new AppError("Invalid asset identifier", 400, "INVALID_ASSET_ID");
    }

    const asset = await prisma.evidenceAsset.findFirst({
      where: {
        id: assetId,
        clueId,
      },
    });

    if (!asset) {
      throw new AppError("Evidence asset record not found", 404, "ASSET_NOT_FOUND");
    }

    return { asset };
  }
}
