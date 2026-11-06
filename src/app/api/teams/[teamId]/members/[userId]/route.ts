import { NextRequest, NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/modules/authentication/guards/auth.guard";
import { TeamService } from "@/modules/teams/services/team.service";
import { prisma } from "@/server/infrastructure/database";
import { AppError } from "@/lib/errors/app-error";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{
    teamId: string;
    userId: string;
  }>;
}

/**
 * DELETE /api/teams/[teamId]/members/[userId]
 * Removes an operative from the squad roster. Authorized strictly for the Lead Investigator.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const user = await requireAuthenticatedUser();
    const { teamId, userId: targetId } = await params;

    // Resolve targetId as playerId or userId for maximum interoperability
    let resolvedPlayerId = targetId;
    const targetProfile = await prisma.playerProfile.findFirst({
      where: {
        OR: [{ id: targetId }, { userId: targetId }],
      },
      select: { id: true },
    });

    if (targetProfile) {
      resolvedPlayerId = targetProfile.id;
    }

    const result = await TeamService.removeTeamMember(user.id, teamId, resolvedPlayerId);

    return NextResponse.json({
      ok: true,
      data: result,
    });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json(
        {
          error: error.message,
          code: error.code,
          ...(error.details ? { details: error.details } : {}),
        },
        { status: error.statusCode }
      );
    }

    logger.error("Unexpected error removing squad member", {
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      { error: "Failed to remove operative from squad", code: "INTERNAL_SERVER_ERROR" },
      { status: 500 }
    );
  }
}
