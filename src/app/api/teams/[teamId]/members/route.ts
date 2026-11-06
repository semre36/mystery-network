import { NextRequest, NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/modules/authentication/guards/auth.guard";
import { TeamService } from "@/modules/teams/services/team.service";
import { AppError } from "@/lib/errors/app-error";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{
    teamId: string;
  }>;
}

/**
 * GET /api/teams/[teamId]/members
 * Retrieves the active roster of operatives for a squad.
 */
export async function GET(_request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  try {
    const user = await requireAuthenticatedUser();
    const { teamId } = await params;

    const members = await TeamService.getTeamMembers(user.id, teamId);

    return NextResponse.json({
      ok: true,
      data: members,
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

    logger.error("Unexpected error retrieving squad roster", {
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      { error: "Failed to retrieve squad roster", code: "INTERNAL_SERVER_ERROR" },
      { status: 500 }
    );
  }
}
