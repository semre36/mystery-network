import { prisma } from "@/server/infrastructure/database";
import { AppError } from "@/lib/errors/app-error";
import { TeamRole, TeamStatus, MembershipStatus } from "@prisma/client";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface VerifiedTeamContext {
  team: any;
  membership: any;
  playerId: string;
}

export class TeamGuard {
  /**
   * Resolves an authenticated user's ID to their PlayerProfile ID.
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
   * Requires that the caller is an active member of the specified team.
   * Returns uniform HTTP 404 for nonexistent teams or non-members to prevent existence probing.
   */
  public static async requireTeamMember(
    teamId: string,
    playerId: string
  ): Promise<VerifiedTeamContext> {
    if (!UUID_REGEX.test(teamId)) {
      throw new AppError("Invalid team identifier", 400, "INVALID_TEAM_ID");
    }

    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        owner: {
          select: {
            id: true,
            codename: true,
            displayName: true,
          },
        },
        members: {
          where: { playerId, status: MembershipStatus.ACTIVE },
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
      },
    });

    if (!team || team.status !== TeamStatus.ACTIVE || team.members.length === 0) {
      throw new AppError("Team not found or restricted", 404, "TEAM_NOT_FOUND");
    }

    return {
      team,
      membership: team.members[0],
      playerId,
    };
  }

  /**
   * Requires that the caller is the Team Leader (LEAD_INVESTIGATOR role or team owner).
   */
  public static async requireTeamLeader(
    teamId: string,
    playerId: string
  ): Promise<VerifiedTeamContext> {
    const context = await this.requireTeamMember(teamId, playerId);

    const isLeader =
      context.membership.role === TeamRole.LEAD_INVESTIGATOR || context.team.ownerId === playerId;

    if (!isLeader) {
      throw new AppError(
        "Only the squad leader is authorized to perform this operation",
        403,
        "TEAM_LEADER_REQUIRED"
      );
    }

    return context;
  }
}
