import { prisma } from "@/server/infrastructure/database";
import { AppError } from "@/lib/errors/app-error";
import {
  ParticipantStatus,
  MembershipStatus,
  TeamStatus,
  InvestigationStatus,
} from "@prisma/client";
import { EvidenceService } from "@/modules/evidence/services/evidence.service";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface VerifiedBoardContext {
  investigation: any;
  playerId: string;
  playerProfile: {
    id: string;
    codename: string;
    displayName: string;
  };
}

export class BoardGuard {
  /**
   * Resolves the PlayerProfile record for a given user ID.
   */
  public static async getPlayerProfile(userId: string) {
    const profile = await prisma.playerProfile.findUnique({
      where: { userId },
      select: {
        id: true,
        codename: true,
        displayName: true,
      },
    });

    if (!profile) {
      throw new AppError("Active investigator profile required", 404, "PLAYER_PROFILE_NOT_FOUND");
    }

    return profile;
  }

  /**
   * Validates that an operative has legitimate access to an investigation session's board.
   * Returns uniform HTTP 404 on unauthorized or restricted requests to prevent existence probing.
   */
  public static async verifyBoardAccess(
    userId: string,
    investigationId: string,
    options?: { allowReadOnlyIfConcluded?: boolean }
  ): Promise<VerifiedBoardContext> {
    const trimmedInvId = (investigationId || "").trim();

    if (!UUID_REGEX.test(trimmedInvId)) {
      throw new AppError("Invalid investigation identifier", 400, "INVALID_INVESTIGATION_ID");
    }

    const playerProfile = await this.getPlayerProfile(userId);
    const playerId = playerProfile.id;

    // 1. Fetch investigation with active participants
    const investigation = await prisma.investigation.findUnique({
      where: { id: trimmedInvId },
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
      },
    });

    if (!investigation || investigation.participants.length === 0) {
      throw new AppError(
        "Investigation session not found or restricted",
        404,
        "INVESTIGATION_NOT_FOUND"
      );
    }

    // 2. Cooperative squad investigation verification
    if (
      investigation.teamId &&
      (investigation.status === InvestigationStatus.IN_PROGRESS ||
        investigation.status === InvestigationStatus.PAUSED ||
        investigation.status === InvestigationStatus.NOT_STARTED)
    ) {
      const team = await prisma.team.findUnique({
        where: { id: investigation.teamId },
        select: { status: true },
      });

      if (!team || team.status !== TeamStatus.ACTIVE) {
        throw new AppError(
          "Investigation session not found or restricted",
          404,
          "INVESTIGATION_NOT_FOUND"
        );
      }

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

    // 3. Concluded investigation check
    const isConcluded =
      investigation.status === InvestigationStatus.SOLVED ||
      investigation.status === InvestigationStatus.ABANDONED ||
      investigation.status === InvestigationStatus.FAILED;

    if (isConcluded && !options?.allowReadOnlyIfConcluded) {
      throw new AppError(
        "Investigation session has concluded. Board modifications are locked.",
        400,
        "INVESTIGATION_CONCLUDED"
      );
    }

    return {
      investigation,
      playerId,
      playerProfile,
    };
  }

  /**
   * Verifies that the requested evidence is declassified and accessible to this operative
   * in this investigation, utilizing EvidenceService directly.
   */
  public static async verifyEvidenceAccessForBoard(
    userId: string,
    investigationId: string,
    clueId: string
  ) {
    const trimmedClueId = (clueId || "").trim();
    if (!UUID_REGEX.test(trimmedClueId)) {
      throw new AppError("Invalid evidence identifier", 400, "INVALID_EVIDENCE_ID");
    }

    // Delegate to EvidenceService to check chapter unlocks, assignments, and share validity
    return await EvidenceService.getEvidenceDetail(userId, investigationId, trimmedClueId);
  }

  /**
   * Verifies that the referenced character belongs to the investigation's case.
   */
  public static async verifyCharacterAccessForBoard(
    investigationCaseId: string,
    characterId: string
  ) {
    const trimmedCharId = (characterId || "").trim();
    if (!UUID_REGEX.test(trimmedCharId)) {
      throw new AppError("Invalid character identifier", 400, "INVALID_CHARACTER_ID");
    }

    const character = await prisma.caseCharacter.findUnique({
      where: { id: trimmedCharId },
    });

    if (!character || character.caseId !== investigationCaseId) {
      throw new AppError("Character dossier not found or restricted", 404, "CHARACTER_NOT_FOUND");
    }

    return character;
  }
}
