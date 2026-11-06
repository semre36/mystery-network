import { prisma } from "@/server/infrastructure/database";
import { AppError } from "@/lib/errors/app-error";
import {
  ParticipantStatus,
  MembershipStatus,
  ContentStatus,
  ChapterProgressStatus,
  InvestigationStatus,
} from "@prisma/client";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface VerifiedPuzzleContext {
  investigation: any;
  participant: any;
  puzzle: any;
  playerId: string;
}

export class PuzzleGuard {
  /**
   * Resolves an authenticated User.id to their PlayerProfile.id.
   */
  public static async getPlayerProfileId(userId: string): Promise<string> {
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
   * Validates that an operative has legitimate access to an investigation's puzzle.
   * Returns uniform HTTP 404 on unauthorized or restricted requests to prevent existence probing.
   */
  public static async verifyPuzzleAccess(
    userId: string,
    investigationId: string,
    puzzleId: string
  ): Promise<VerifiedPuzzleContext> {
    const playerId = await this.getPlayerProfileId(userId);

    const trimmedInvId = investigationId.trim();
    const trimmedPuzId = puzzleId.trim();

    if (!UUID_REGEX.test(trimmedInvId)) {
      throw new AppError("Invalid investigation identifier", 400, "INVALID_INVESTIGATION_ID");
    }

    if (!UUID_REGEX.test(trimmedPuzId)) {
      throw new AppError("Invalid puzzle identifier", 400, "INVALID_PUZZLE_ID");
    }

    // 1. Fetch investigation with participants, team, and chapter progress
    const investigation = await prisma.investigation.findUnique({
      where: { id: trimmedInvId },
      include: {
        participants: {
          where: { playerId, status: ParticipantStatus.ACTIVE },
        },
        progress: {
          include: { chapter: true },
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

    // 2. Active squad membership check for cooperative squad investigations
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

    // 3. Fetch puzzle with stages and hints
    const puzzle = await prisma.puzzle.findUnique({
      where: { id: trimmedPuzId },
      include: {
        chapter: true,
        stages: {
          orderBy: { stageOrder: "asc" },
        },
        hints: {
          orderBy: { hintOrder: "asc" },
        },
      },
    });

    if (!puzzle || puzzle.status !== ContentStatus.PUBLISHED) {
      throw new AppError("Challenge not found or restricted", 404, "PUZZLE_NOT_FOUND");
    }

    // 4. Verify puzzle belongs to the investigation's case
    if (puzzle.caseId !== investigation.caseId) {
      throw new AppError("Challenge not found or restricted", 404, "PUZZLE_NOT_FOUND");
    }

    // 5. Verify chapter unlock state (if puzzle is attached to a chapter)
    if (puzzle.chapterId) {
      const chapterProg = (investigation.progress || []).find(
        (p) => p.chapterId === puzzle.chapterId
      );
      if (!chapterProg || chapterProg.status === ChapterProgressStatus.LOCKED) {
        throw new AppError(
          "This challenge is locked in an unrevealed chapter",
          403,
          "CHAPTER_LOCKED"
        );
      }
    }

    return {
      investigation,
      participant: investigation.participants[0],
      puzzle,
      playerId,
    };
  }

  /**
   * Verifies stage access within a puzzle.
   */
  public static verifyStageAccess(puzzle: any, stageId: string, currentStageOrder: number): any {
    const stage = puzzle.stages.find((s: any) => s.id === stageId);
    if (!stage) {
      throw new AppError("Puzzle stage not found", 404, "STAGE_NOT_FOUND");
    }

    if (stage.stageOrder > currentStageOrder) {
      throw new AppError(
        "This challenge stage is currently locked. Complete prior stages first.",
        403,
        "STAGE_LOCKED"
      );
    }

    return stage;
  }
}
