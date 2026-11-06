import { NextRequest, NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/modules/authentication/guards/auth.guard";
import { TeamService } from "@/modules/teams/services/team.service";
import { UpdateTeamSchema } from "@/modules/teams/validation/team.schema";
import { AppError } from "@/lib/errors/app-error";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{
    teamId: string;
  }>;
}

/**
 * GET /api/teams/[teamId]
 * Retrieves full squad dossier for an authorized operative.
 */
export async function GET(_request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  try {
    const user = await requireAuthenticatedUser();
    const { teamId } = await params;

    const squad = await TeamService.getTeamById(user.id, teamId);

    return NextResponse.json({
      ok: true,
      data: squad,
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

    logger.error("Unexpected error retrieving squad details", {
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      { error: "Failed to retrieve squad dossier", code: "INTERNAL_SERVER_ERROR" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/teams/[teamId]
 * Updates squad metadata (name, description, avatarUrl). Authorized for Lead Investigator.
 */
export async function PATCH(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  try {
    const user = await requireAuthenticatedUser();
    const { teamId } = await params;

    let bodyJson: unknown;
    try {
      bodyJson = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Malformed JSON payload", code: "INVALID_JSON" },
        { status: 400 }
      );
    }

    const parsed = UpdateTeamSchema.safeParse(bodyJson);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid squad update parameters",
          code: "VALIDATION_ERROR",
          details: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    const squad = await TeamService.updateTeam(user.id, teamId, parsed.data);

    return NextResponse.json({
      ok: true,
      data: squad,
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

    logger.error("Unexpected error updating squad", {
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      { error: "Failed to update squad dossier", code: "INTERNAL_SERVER_ERROR" },
      { status: 500 }
    );
  }
}
