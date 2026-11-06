import { prisma } from "@/server/infrastructure/database";
import { AppError } from "@/lib/errors/app-error";
import { logger } from "@/lib/logger";
import {
  TeamRole,
  TeamStatus,
  MembershipStatus,
  InvitationStatus,
  InvestigationStatus,
} from "@prisma/client";
import {
  TeamSummaryDto,
  TeamDetailDto,
  TeamMemberDto,
  TeamInvestigationDto,
  CreateTeamInput,
  UpdateTeamInput,
} from "../types/team.types";
import { TeamGuard } from "../guards/team.guard";
import crypto from "crypto";

export class TeamService {
  /**
   * Generates a collision-resistant, human-readable squad code (e.g. SQ-7F2A-9K3B).
   */
  private static generateTeamCode(): string {
    const part1 = crypto.randomBytes(2).toString("hex").toUpperCase();
    const part2 = crypto.randomBytes(2).toString("hex").toUpperCase();
    return `SQ-${part1}-${part2}`;
  }

  /**
   * Creates a new persistent operative squad.
   * Atomically assigns the creator as the initial LEAD_INVESTIGATOR.
   */
  public static async createTeam(userId: string, input: CreateTeamInput): Promise<TeamDetailDto> {
    const playerId = await TeamGuard.getPlayerProfileId(userId);

    const name = input.name.trim();
    if (!name || name.length < 3 || name.length > 50) {
      throw new AppError(
        "Team callsign must be between 3 and 50 characters",
        400,
        "INVALID_TEAM_NAME"
      );
    }

    const description = input.description ? input.description.trim() : null;
    const avatarUrl = input.avatarUrl ? input.avatarUrl.trim() : null;

    // Retry loop for team code collisions (statistically negligible)
    let teamCode = this.generateTeamCode();
    let attempts = 0;
    while (attempts < 5) {
      const existing = await prisma.team.findUnique({
        where: { inviteCode: teamCode },
      });
      if (!existing) break;
      teamCode = this.generateTeamCode();
      attempts++;
    }

    // Atomic transaction: create Team and initial LEAD_INVESTIGATOR membership
    const team = await prisma.$transaction(async (tx) => {
      const newTeam = await tx.team.create({
        data: {
          name,
          description,
          avatarUrl,
          inviteCode: teamCode,
          ownerId: playerId,
          status: TeamStatus.ACTIVE,
        },
      });

      await tx.teamMembership.create({
        data: {
          teamId: newTeam.id,
          playerId,
          role: TeamRole.LEAD_INVESTIGATOR,
          status: MembershipStatus.ACTIVE,
          joinedAt: new Date(),
        },
      });

      return newTeam;
    });

    logger.info("Operative squad created successfully", {
      teamId: team.id,
      name: team.name,
      teamCode: team.inviteCode,
      creatorPlayerId: playerId,
    });

    return await this.getTeamById(userId, team.id);
  }

  /**
   * Retrieves all squads the authenticated operative is an active member of.
   */
  public static async getMyTeams(userId: string): Promise<TeamSummaryDto[]> {
    const playerId = await TeamGuard.getPlayerProfileId(userId);

    const memberships = await prisma.teamMembership.findMany({
      where: {
        playerId,
        status: MembershipStatus.ACTIVE,
        team: { status: TeamStatus.ACTIVE },
      },
      include: {
        team: {
          include: {
            owner: {
              select: {
                id: true,
                codename: true,
                displayName: true,
              },
            },
            _count: {
              select: {
                members: { where: { status: MembershipStatus.ACTIVE } },
                investigations: {
                  where: {
                    status: {
                      in: [InvestigationStatus.IN_PROGRESS, InvestigationStatus.PAUSED],
                    },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { joinedAt: "desc" },
    });

    return memberships.map((m) => ({
      id: m.team.id,
      name: m.team.name,
      description: m.team.description,
      avatarUrl: m.team.avatarUrl,
      teamCode: m.team.inviteCode,
      ownerCodename: m.team.owner.codename,
      ownerDisplayName: m.team.owner.displayName,
      myRole: m.role,
      memberCount: m.team._count.members,
      activeInvestigationCount: m.team._count.investigations,
      createdAt: m.team.createdAt.toISOString(),
    }));
  }

  /**
   * Retrieves full dossier for a specific squad.
   * Access-controlled: Requires active membership in the squad.
   */
  public static async getTeamById(userId: string, teamId: string): Promise<TeamDetailDto> {
    const playerId = await TeamGuard.getPlayerProfileId(userId);
    const { team, membership } = await TeamGuard.requireTeamMember(teamId, playerId);

    // 1. Fetch all active squad members
    const members = await prisma.teamMembership.findMany({
      where: {
        teamId,
        status: MembershipStatus.ACTIVE,
      },
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
      orderBy: [
        { role: "asc" }, // LEAD_INVESTIGATOR first
        { joinedAt: "asc" },
      ],
    });

    const memberDtos: TeamMemberDto[] = members.map((m) => ({
      id: m.id,
      playerId: m.player.id,
      codename: m.player.codename,
      displayName: m.player.displayName,
      avatarUrl: m.player.avatarUrl,
      role: m.role,
      status: m.status,
      joinedAt: m.joinedAt.toISOString(),
      isLeader: m.role === TeamRole.LEAD_INVESTIGATOR || m.playerId === team.ownerId,
    }));

    // 2. Fetch active investigations linked to this team
    const investigations = await prisma.investigation.findMany({
      where: {
        teamId,
        status: {
          in: [
            InvestigationStatus.IN_PROGRESS,
            InvestigationStatus.PAUSED,
            InvestigationStatus.NOT_STARTED,
          ],
        },
      },
      include: {
        case: {
          select: {
            caseCode: true,
            title: true,
          },
        },
        progress: {
          include: { chapter: true },
          orderBy: { chapter: { chapterOrder: "asc" } },
        },
        _count: {
          select: {
            participants: { where: { status: "ACTIVE" } },
          },
        },
      },
      orderBy: { startedAt: "desc" },
    });

    const investigationDtos: TeamInvestigationDto[] = investigations.map((inv) => {
      const activeChapter = inv.progress.find(
        (p) => p.status === "IN_PROGRESS" || p.status === "UNLOCKED"
      );

      return {
        id: inv.id,
        caseCode: inv.case.caseCode,
        caseTitle: inv.case.title,
        status: inv.status,
        playMode: inv.playMode,
        currentChapterOrder: activeChapter ? activeChapter.chapter.chapterOrder : null,
        currentChapterTitle: activeChapter ? activeChapter.chapter.title : null,
        participantCount: inv._count.participants,
        startedAt: inv.startedAt.toISOString(),
      };
    });

    // 3. Count pending invitations (visible to leader only)
    let pendingInvitationsCount = 0;
    if (membership.role === TeamRole.LEAD_INVESTIGATOR || team.ownerId === playerId) {
      pendingInvitationsCount = await prisma.teamInvitation.count({
        where: {
          teamId,
          status: InvitationStatus.PENDING,
          expiresAt: { gt: new Date() },
        },
      });
    }

    return {
      id: team.id,
      name: team.name,
      description: team.description,
      avatarUrl: team.avatarUrl,
      teamCode: team.inviteCode,
      status: team.status,
      ownerId: team.owner.id,
      ownerCodename: team.owner.codename,
      ownerDisplayName: team.owner.displayName,
      myRole: membership.role,
      members: memberDtos,
      activeInvestigations: investigationDtos,
      pendingInvitationsCount,
      createdAt: team.createdAt.toISOString(),
      updatedAt: team.updatedAt.toISOString(),
    };
  }

  /**
   * Updates team metadata (name, description, avatarUrl).
   * Authorized strictly for the LEAD_INVESTIGATOR.
   */
  public static async updateTeam(
    userId: string,
    teamId: string,
    input: UpdateTeamInput
  ): Promise<TeamDetailDto> {
    const playerId = await TeamGuard.getPlayerProfileId(userId);
    await TeamGuard.requireTeamLeader(teamId, playerId);

    const data: any = { updatedAt: new Date() };

    if (input.name !== undefined) {
      const trimmedName = input.name.trim();
      if (trimmedName.length < 3 || trimmedName.length > 50) {
        throw new AppError(
          "Team callsign must be between 3 and 50 characters",
          400,
          "INVALID_TEAM_NAME"
        );
      }
      data.name = trimmedName;
    }

    if (input.description !== undefined) {
      data.description = input.description ? input.description.trim() : null;
    }

    if (input.avatarUrl !== undefined) {
      data.avatarUrl = input.avatarUrl ? input.avatarUrl.trim() : null;
    }

    await prisma.team.update({
      where: { id: teamId },
      data,
    });

    logger.info("Squad metadata updated", { teamId, updatedBy: playerId });

    return await this.getTeamById(userId, teamId);
  }

  /**
   * Retrieves active member roster for a squad.
   */
  public static async getTeamMembers(userId: string, teamId: string): Promise<TeamMemberDto[]> {
    const playerId = await TeamGuard.getPlayerProfileId(userId);
    const { team } = await TeamGuard.requireTeamMember(teamId, playerId);

    const members = await prisma.teamMembership.findMany({
      where: {
        teamId,
        status: MembershipStatus.ACTIVE,
      },
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
      orderBy: [{ role: "asc" }, { joinedAt: "asc" }],
    });

    return members.map((m) => ({
      id: m.id,
      playerId: m.player.id,
      codename: m.player.codename,
      displayName: m.player.displayName,
      avatarUrl: m.player.avatarUrl,
      role: m.role,
      status: m.status,
      joinedAt: m.joinedAt.toISOString(),
      isLeader: m.role === TeamRole.LEAD_INVESTIGATOR || m.playerId === team.ownerId,
    }));
  }

  /**
   * Allows an operative to leave a squad voluntarily.
   * If the sole leader attempts to leave without transferring leadership, operation is blocked.
   * If the squad has no remaining members, the team is automatically disbanded.
   */
  public static async leaveTeam(
    userId: string,
    teamId: string
  ): Promise<{ message: string; disbanded: boolean }> {
    const playerId = await TeamGuard.getPlayerProfileId(userId);
    const { team, membership } = await TeamGuard.requireTeamMember(teamId, playerId);

    const isLeader = membership.role === TeamRole.LEAD_INVESTIGATOR || team.ownerId === playerId;

    return await prisma.$transaction(async (tx) => {
      const activeMembers = await tx.teamMembership.findMany({
        where: { teamId, status: MembershipStatus.ACTIVE },
      });

      if (isLeader) {
        // Check if there are other active leaders
        const otherLeaders = activeMembers.filter(
          (m) => m.playerId !== playerId && m.role === TeamRole.LEAD_INVESTIGATOR
        );

        if (otherLeaders.length === 0 && activeMembers.length > 1) {
          throw new AppError(
            "Squad leader must transfer leadership before leaving an active unit",
            400,
            "LEADER_MUST_TRANSFER"
          );
        }
      }

      // Mark membership as LEFT
      await tx.teamMembership.update({
        where: { id: membership.id },
        data: { status: MembershipStatus.LEFT },
      });

      const remainingMembers = activeMembers.filter((m) => m.playerId !== playerId);
      let disbanded = false;

      if (remainingMembers.length === 0) {
        // Disband the empty team
        await tx.team.update({
          where: { id: teamId },
          data: { status: TeamStatus.DISBANDED },
        });
        disbanded = true;
      }

      logger.info("Operative left squad", {
        teamId,
        playerId,
        disbanded,
      });

      return {
        message: disbanded
          ? "You have left the squad. The unit had no remaining operatives and was disbanded."
          : "You have voluntarily departed from the operative unit.",
        disbanded,
      };
    });
  }

  /**
   * Removes a member from the squad.
   * Authorized strictly for the LEAD_INVESTIGATOR.
   */
  public static async removeTeamMember(
    userId: string,
    teamId: string,
    targetPlayerId: string
  ): Promise<{ message: string }> {
    const callerPlayerId = await TeamGuard.getPlayerProfileId(userId);
    await TeamGuard.requireTeamLeader(teamId, callerPlayerId);

    if (callerPlayerId === targetPlayerId) {
      throw new AppError(
        "Squad leader cannot remove themselves; use leave squad instead",
        400,
        "CANNOT_REMOVE_SELF"
      );
    }

    const targetMembership = await prisma.teamMembership.findUnique({
      where: {
        teamId_playerId: {
          teamId,
          playerId: targetPlayerId,
        },
      },
    });

    if (!targetMembership || targetMembership.status !== MembershipStatus.ACTIVE) {
      throw new AppError("Target operative is not an active squad member", 404, "MEMBER_NOT_FOUND");
    }

    // Mark as REMOVED (preserves historical contribution records)
    await prisma.teamMembership.update({
      where: { id: targetMembership.id },
      data: { status: MembershipStatus.REMOVED },
    });

    logger.info("Operative removed from squad by leader", {
      teamId,
      removedPlayerId: targetPlayerId,
      leaderPlayerId: callerPlayerId,
    });

    return { message: "Operative removed from squad roster successfully." };
  }

  /**
   * Transfers squad leadership to another active member.
   * Authorized strictly for the current LEAD_INVESTIGATOR.
   */
  public static async transferTeamLeadership(
    userId: string,
    teamId: string,
    newLeaderPlayerId: string
  ): Promise<TeamDetailDto> {
    const callerPlayerId = await TeamGuard.getPlayerProfileId(userId);
    const { membership: currentLeaderMembership } = await TeamGuard.requireTeamLeader(
      teamId,
      callerPlayerId
    );

    if (callerPlayerId === newLeaderPlayerId) {
      throw new AppError("You are already the squad leader", 400, "ALREADY_LEADER");
    }

    const targetMembership = await prisma.teamMembership.findUnique({
      where: {
        teamId_playerId: {
          teamId,
          playerId: newLeaderPlayerId,
        },
      },
    });

    if (!targetMembership || targetMembership.status !== MembershipStatus.ACTIVE) {
      throw new AppError("Target operative is not an active squad member", 404, "MEMBER_NOT_FOUND");
    }

    // Execute leadership transfer in atomic transaction
    await prisma.$transaction(async (tx) => {
      // Demote current leader to DETECTIVE
      await tx.teamMembership.update({
        where: { id: currentLeaderMembership.id },
        data: { role: TeamRole.DETECTIVE },
      });

      // Promote target operative to LEAD_INVESTIGATOR
      await tx.teamMembership.update({
        where: { id: targetMembership.id },
        data: { role: TeamRole.LEAD_INVESTIGATOR },
      });

      // Update team ownerId
      await tx.team.update({
        where: { id: teamId },
        data: { ownerId: newLeaderPlayerId },
      });
    });

    logger.info("Squad leadership transferred", {
      teamId,
      previousLeaderId: callerPlayerId,
      newLeaderId: newLeaderPlayerId,
    });

    return await this.getTeamById(userId, teamId);
  }
}
