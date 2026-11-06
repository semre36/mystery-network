import { prisma } from "@/server/infrastructure/database";
import { AppError } from "@/lib/errors/app-error";
import { logger } from "@/lib/logger";
import { InvitationStatus, MembershipStatus, TeamRole, TeamStatus } from "@prisma/client";
import {
  TeamInvitationDto,
  InvitationPreviewDto,
  CreateInvitationInput,
} from "../types/team.types";
import { TeamGuard } from "../guards/team.guard";
import crypto from "crypto";

export class InvitationService {
  /**
   * Hashes a raw invitation token with SHA-256 for secure database lookup.
   */
  public static hashToken(rawToken: string): string {
    return crypto.createHash("sha256").update(rawToken).digest("hex");
  }

  /**
   * Creates a cryptographically secure, time-limited squad invitation.
   * Authorized strictly for the LEAD_INVESTIGATOR.
   */
  public static async createInvitation(
    userId: string,
    teamId: string,
    input: CreateInvitationInput = {}
  ): Promise<{ invitation: TeamInvitationDto; rawToken: string }> {
    const callerPlayerId = await TeamGuard.getPlayerProfileId(userId);
    const { team } = await TeamGuard.requireTeamLeader(teamId, callerPlayerId);

    const expiresInDays = Math.min(30, Math.max(1, input.expiresInDays ?? 7));
    const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);

    // If invitation is targeted to a specific operative, validate operative exists & isn't already in squad
    let targetPlayer: any = null;
    if (input.invitedPlayerId) {
      targetPlayer = await prisma.playerProfile.findUnique({
        where: { id: input.invitedPlayerId },
      });

      if (!targetPlayer) {
        throw new AppError("Target operative profile not found", 404, "TARGET_PLAYER_NOT_FOUND");
      }

      // Check if already an active squad member
      const existingMembership = await prisma.teamMembership.findUnique({
        where: {
          teamId_playerId: {
            teamId,
            playerId: input.invitedPlayerId,
          },
        },
      });

      if (existingMembership && existingMembership.status === MembershipStatus.ACTIVE) {
        throw new AppError(
          "Target operative is already an active member of this squad",
          400,
          "ALREADY_TEAM_MEMBER"
        );
      }

      // Check if duplicate pending invitation exists
      const existingPending = await prisma.teamInvitation.findFirst({
        where: {
          teamId,
          invitedPlayerId: input.invitedPlayerId,
          status: InvitationStatus.PENDING,
          expiresAt: { gt: new Date() },
        },
      });

      if (existingPending) {
        throw new AppError(
          "An active pending invitation already exists for this operative",
          400,
          "DUPLICATE_INVITATION"
        );
      }
    }

    // Generate 256 bits of cryptographically secure random entropy
    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = this.hashToken(rawToken);

    const invitation = await prisma.teamInvitation.create({
      data: {
        teamId,
        invitationCode: tokenHash,
        createdById: callerPlayerId,
        invitedPlayerId: input.invitedPlayerId ?? null,
        expiresAt,
        status: InvitationStatus.PENDING,
      },
      include: {
        createdBy: { select: { codename: true } },
        invitedPlayer: { select: { codename: true } },
      },
    });

    // Sanitized audit log: NEVER log rawToken
    logger.info("Created team invitation token", {
      invitationId: invitation.id,
      teamId,
      createdById: callerPlayerId,
      invitedPlayerId: input.invitedPlayerId ?? null,
      expiresAt: expiresAt.toISOString(),
    });

    return {
      rawToken,
      invitation: {
        id: invitation.id,
        teamId: team.id,
        teamName: team.name,
        createdById: callerPlayerId,
        createdByCodename: invitation.createdBy.codename,
        invitedPlayerId: invitation.invitedPlayerId,
        invitedPlayerCodename: invitation.invitedPlayer?.codename ?? null,
        status: invitation.status,
        expiresAt: invitation.expiresAt.toISOString(),
        createdAt: invitation.createdAt.toISOString(),
        inviteLink: `/invitations/${rawToken}`,
      },
    };
  }

  /**
   * Previews squad invitation details without accepting.
   * Safe public preview: Never leaks token hashes, internal IDs, or participant rosters.
   */
  public static async getInvitationPreview(rawToken: string): Promise<InvitationPreviewDto> {
    const trimmedToken = rawToken.trim();
    if (!trimmedToken) {
      throw new AppError("Invitation token is required", 400, "INVALID_TOKEN");
    }

    const tokenHash = this.hashToken(trimmedToken);

    const invitation = await prisma.teamInvitation.findUnique({
      where: { invitationCode: tokenHash },
      include: {
        team: {
          include: {
            owner: { select: { codename: true } },
            _count: {
              select: {
                members: { where: { status: MembershipStatus.ACTIVE } },
              },
            },
          },
        },
      },
    });

    if (!invitation || invitation.team.status !== TeamStatus.ACTIVE) {
      throw new AppError("Invitation not found or restricted", 404, "INVITATION_NOT_FOUND");
    }

    const isExpired = invitation.expiresAt <= new Date();

    return {
      teamId: invitation.team.id,
      teamName: invitation.team.name,
      description: invitation.team.description,
      avatarUrl: invitation.team.avatarUrl,
      leaderCodename: invitation.team.owner.codename,
      memberCount: invitation.team._count.members,
      expiresAt: invitation.expiresAt.toISOString(),
      status:
        isExpired && invitation.status === InvitationStatus.PENDING
          ? InvitationStatus.EXPIRED
          : invitation.status,
      isExpired,
    };
  }

  /**
   * Accepts a squad invitation and enrolls the caller as a DETECTIVE.
   * Concurrency-safe: Runs in an interactive transaction with validation and state transitions.
   */
  public static async acceptInvitation(
    userId: string,
    rawToken: string
  ): Promise<{ teamId: string; teamName: string }> {
    const callerPlayerId = await TeamGuard.getPlayerProfileId(userId);

    const trimmedToken = rawToken.trim();
    if (!trimmedToken) {
      throw new AppError("Invitation token is required", 400, "INVALID_TOKEN");
    }

    const tokenHash = this.hashToken(trimmedToken);

    return await prisma.$transaction(async (tx) => {
      const invitation = await tx.teamInvitation.findUnique({
        where: { invitationCode: tokenHash },
        include: {
          team: true,
        },
      });

      if (!invitation || invitation.team.status !== TeamStatus.ACTIVE) {
        throw new AppError("Invitation not found or restricted", 404, "INVITATION_NOT_FOUND");
      }

      if (invitation.status === InvitationStatus.REVOKED || invitation.revokedAt) {
        throw new AppError(
          "This invitation has been revoked by squad leadership",
          410,
          "INVITATION_REVOKED"
        );
      }

      if (invitation.status === InvitationStatus.ACCEPTED) {
        throw new AppError(
          "This invitation has already been accepted and cannot be reused",
          410,
          "INVITATION_ALREADY_USED"
        );
      }

      if (invitation.expiresAt <= new Date() || invitation.status === InvitationStatus.EXPIRED) {
        throw new AppError("This invitation has expired", 410, "INVITATION_EXPIRED");
      }

      // If targeted to a specific operative, verify caller is that operative
      if (invitation.invitedPlayerId && invitation.invitedPlayerId !== callerPlayerId) {
        throw new AppError(
          "This invitation was dispatched to another operative",
          403,
          "INVITATION_RESTRICTED"
        );
      }

      // Check if caller is already an active member of this squad
      const existingMembership = await tx.teamMembership.findUnique({
        where: {
          teamId_playerId: {
            teamId: invitation.teamId,
            playerId: callerPlayerId,
          },
        },
      });

      if (existingMembership && existingMembership.status === MembershipStatus.ACTIVE) {
        throw new AppError(
          "You are already an active member of this squad",
          400,
          "ALREADY_TEAM_MEMBER"
        );
      }

      // Upsert membership (reactivate if previously left or create new)
      if (existingMembership) {
        await tx.teamMembership.update({
          where: { id: existingMembership.id },
          data: {
            role: TeamRole.DETECTIVE,
            status: MembershipStatus.ACTIVE,
            joinedAt: new Date(),
          },
        });
      } else {
        await tx.teamMembership.create({
          data: {
            teamId: invitation.teamId,
            playerId: callerPlayerId,
            role: TeamRole.DETECTIVE,
            status: MembershipStatus.ACTIVE,
            joinedAt: new Date(),
          },
        });
      }

      // Mark invitation as ACCEPTED
      await tx.teamInvitation.update({
        where: { id: invitation.id },
        data: {
          status: InvitationStatus.ACCEPTED,
          acceptedAt: new Date(),
        },
      });

      logger.info("Squad invitation accepted successfully", {
        teamId: invitation.teamId,
        playerId: callerPlayerId,
        invitationId: invitation.id,
      });

      return {
        teamId: invitation.team.id,
        teamName: invitation.team.name,
      };
    });
  }

  /**
   * Declines a squad invitation.
   */
  public static async declineInvitation(
    userId: string,
    rawToken: string
  ): Promise<{ message: string }> {
    const callerPlayerId = await TeamGuard.getPlayerProfileId(userId);

    const trimmedToken = rawToken.trim();
    if (!trimmedToken) {
      throw new AppError("Invitation token is required", 400, "INVALID_TOKEN");
    }

    const tokenHash = this.hashToken(trimmedToken);

    const invitation = await prisma.teamInvitation.findUnique({
      where: { invitationCode: tokenHash },
    });

    if (!invitation || invitation.status !== InvitationStatus.PENDING) {
      throw new AppError("Invitation not found or no longer active", 404, "INVITATION_NOT_FOUND");
    }

    if (invitation.invitedPlayerId && invitation.invitedPlayerId !== callerPlayerId) {
      throw new AppError("Unauthorized action on this invitation", 403, "FORBIDDEN");
    }

    await prisma.teamInvitation.update({
      where: { id: invitation.id },
      data: {
        status: InvitationStatus.DECLINED,
      },
    });

    logger.info("Squad invitation declined", {
      invitationId: invitation.id,
      playerId: callerPlayerId,
    });

    return { message: "Squad invitation declined." };
  }

  /**
   * Revokes an active invitation.
   * Authorized strictly for the LEAD_INVESTIGATOR.
   */
  public static async revokeInvitation(
    userId: string,
    teamId: string,
    invitationId: string
  ): Promise<{ message: string }> {
    const callerPlayerId = await TeamGuard.getPlayerProfileId(userId);
    await TeamGuard.requireTeamLeader(teamId, callerPlayerId);

    const invitation = await prisma.teamInvitation.findUnique({
      where: { id: invitationId },
    });

    if (!invitation || invitation.teamId !== teamId) {
      throw new AppError("Invitation not found in this squad", 404, "INVITATION_NOT_FOUND");
    }

    if (invitation.status === InvitationStatus.ACCEPTED) {
      throw new AppError(
        "Cannot revoke an invitation that has already been accepted",
        400,
        "INVITATION_ALREADY_ACCEPTED"
      );
    }

    if (invitation.status === InvitationStatus.REVOKED) {
      throw new AppError("Invitation is already revoked", 400, "INVITATION_ALREADY_REVOKED");
    }

    await prisma.teamInvitation.update({
      where: { id: invitationId },
      data: {
        status: InvitationStatus.REVOKED,
        revokedAt: new Date(),
      },
    });

    logger.info("Squad invitation revoked by leader", {
      invitationId,
      teamId,
      revokedBy: callerPlayerId,
    });

    return { message: "Invitation revoked successfully." };
  }

  /**
   * Retrieves all invitations for a squad (pending, accepted, expired, revoked).
   * Authorized strictly for the LEAD_INVESTIGATOR.
   */
  public static async getTeamInvitations(
    userId: string,
    teamId: string
  ): Promise<TeamInvitationDto[]> {
    const callerPlayerId = await TeamGuard.getPlayerProfileId(userId);
    const { team } = await TeamGuard.requireTeamLeader(teamId, callerPlayerId);

    const invitations = await prisma.teamInvitation.findMany({
      where: { teamId },
      include: {
        createdBy: { select: { codename: true } },
        invitedPlayer: { select: { codename: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return invitations.map((inv) => ({
      id: inv.id,
      teamId: team.id,
      teamName: team.name,
      createdById: inv.createdById,
      createdByCodename: inv.createdBy.codename,
      invitedPlayerId: inv.invitedPlayerId,
      invitedPlayerCodename: inv.invitedPlayer?.codename ?? null,
      status: inv.status,
      expiresAt: inv.expiresAt.toISOString(),
      createdAt: inv.createdAt.toISOString(),
    }));
  }
}
