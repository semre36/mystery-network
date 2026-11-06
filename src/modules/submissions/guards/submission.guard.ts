import { prisma } from "@/server/infrastructure/database";
import { AppError } from "@/lib/errors/app-error";
import {
  InvestigationStatus,
  ParticipantStatus,
  MembershipStatus,
  TeamStatus,
  TeamRole,
  PlayMode,
} from "@prisma/client";

export class SubmissionGuard {
  /**
   * Verifies access to an investigation session for submission operations.
   */
  public static async verifySubmissionAccess(investigationId: string, userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });

    if (!user || !user.profile) {
      throw new AppError("Investigator profile not found", 404, "PLAYER_NOT_FOUND");
    }

    const playerId = user.profile.id;

    const investigation = await prisma.investigation.findUnique({
      where: { id: investigationId },
      include: {
        case: {
          select: {
            id: true,
            title: true,
            caseCode: true,
            difficulty: true,
            status: true,
            solutionConfig: true,
          },
        },
        team: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
        participants: {
          where: { playerId, status: ParticipantStatus.ACTIVE },
        },
      },
    });

    if (!investigation) {
      throw new AppError("Investigation session not found", 404, "INVESTIGATION_NOT_FOUND");
    }

    if (investigation.participants.length === 0) {
      throw new AppError(
        "Operative is not an active participant in this investigation",
        403,
        "UNAUTHORIZED_PARTICIPANT"
      );
    }

    // If squad-linked, verify squad membership and active status
    let memberRole: TeamRole | null = null;
    if (investigation.teamId) {
      if (investigation.team?.status === TeamStatus.DISBANDED) {
        throw new AppError(
          "Investigation squad has been disbanded. Operational workspace locked.",
          403,
          "TEAM_DISBANDED"
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
          "Operative is no longer an active member of this investigation squad",
          403,
          "UNAUTHORIZED_TEAM_MEMBER"
        );
      }

      memberRole = membership.role;
    }

    return {
      investigation,
      playerId,
      playerProfile: user.profile,
      memberRole,
    };
  }

  /**
   * Validates that all character IDs belong to the investigated case.
   */
  public static async validateCharacterReferences(
    caseId: string,
    primaryCharacterId?: string | null,
    additionalCharacterIds: string[] = []
  ) {
    const characterIdsToCheck = [
      ...(primaryCharacterId ? [primaryCharacterId] : []),
      ...additionalCharacterIds,
    ];

    if (characterIdsToCheck.length === 0) return;

    const validCharacters = await prisma.caseCharacter.findMany({
      where: {
        id: { in: characterIdsToCheck },
        caseId,
      },
      select: { id: true },
    });

    const validIdSet = new Set(validCharacters.map((c) => c.id));
    for (const charId of characterIdsToCheck) {
      if (!validIdSet.has(charId)) {
        throw new AppError(
          `Invalid suspect reference: character '${charId}' is not registered in this case`,
          400,
          "INVALID_CHARACTER_REFERENCE"
        );
      }
    }
  }

  /**
   * Validates that all referenced evidence clues belong to the case AND have been
   * declassified/assigned/shared with this investigation and player/squad.
   */
  public static async validateEvidenceReferences(
    investigationId: string,
    caseId: string,
    playerId: string,
    playMode: PlayMode,
    supportingEvidenceIds: string[] = [],
    contradictingEvidenceIds: string[] = []
  ) {
    const allEvidenceIds = Array.from(
      new Set([...supportingEvidenceIds, ...contradictingEvidenceIds])
    );
    if (allEvidenceIds.length === 0) return;

    // 1. Verify clues exist in this case
    const cluesInCase = await prisma.clue.findMany({
      where: {
        id: { in: allEvidenceIds },
        caseId,
      },
      select: { id: true, clueCode: true },
    });

    if (cluesInCase.length !== allEvidenceIds.length) {
      const foundIds = new Set(cluesInCase.map((c) => c.id));
      const missingId = allEvidenceIds.find((id) => !foundIds.has(id));
      throw new AppError(
        `Invalid evidence reference: clue '${missingId}' is not associated with this case`,
        400,
        "INVALID_EVIDENCE_REFERENCE"
      );
    }

    // 2. Verify player or squad has legitimate access to these clues in this investigation session
    // In cooperative mode, evidence assigned to ANY squad participant or shared is accessible.
    // In solo mode, evidence must be assigned to this player or shared with this player.
    const assignments = await prisma.clueAssignment.findMany({
      where: {
        investigationId,
        clueId: { in: allEvidenceIds },
        ...(playMode === PlayMode.SOLO ? { playerId } : {}),
      },
      select: { clueId: true },
    });

    const accessibleClueIds = new Set(assignments.map((a) => a.clueId));

    // Check shared evidence
    const shares = await prisma.evidenceShare.findMany({
      where: {
        investigationId,
        clueAssignment: { clueId: { in: allEvidenceIds } },
        revokedAt: null,
        ...(playMode === PlayMode.SOLO
          ? {
              OR: [{ recipientPlayerId: playerId }, { recipientPlayerId: null }],
            }
          : {}),
      },
      select: {
        clueAssignment: { select: { clueId: true } },
      },
    });

    for (const s of shares) {
      if (s.clueAssignment?.clueId) {
        accessibleClueIds.add(s.clueAssignment.clueId);
      }
    }

    // Verify all cited clues are accessible
    for (const clueId of allEvidenceIds) {
      if (!accessibleClueIds.has(clueId)) {
        throw new AppError(
          `Unauthorized evidence reference: clue '${clueId}' has not been declassified or assigned to this investigator`,
          403,
          "UNAUTHORIZED_EVIDENCE_ACCESS"
        );
      }
    }
  }

  /**
   * Verifies that the operative has permission to submit the final indictment.
   * In cooperative investigations, only the Lead Investigator can submit on behalf of the team.
   */
  public static verifySubmitPermission(playMode: PlayMode, role: TeamRole | null) {
    if (playMode === PlayMode.COOPERATIVE && role !== TeamRole.LEAD_INVESTIGATOR) {
      throw new AppError(
        "Only the Lead Investigator of the squad has authority to submit the final case indictment",
        403,
        "LEAD_INVESTIGATOR_REQUIRED"
      );
    }
  }
}
