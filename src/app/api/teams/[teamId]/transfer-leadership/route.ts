import { NextRequest, NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/modules/authentication/guards/auth.guard";
import { TeamService } from "@/modules/teams/services/team.service";
import { TransferLeadershipSchema } from "@/modules/teams/validation/team.schema";
import { AppError } from "@/lib/errors/app-error";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{
    teamId: string;
  }>;
}

/**
 * POST /api/teams/[teamId]/transfer-leadership
 * Transfers squad leadership to another active operative. Authorized strictly for the Lead Investigator.
 */
export async function POST(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
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

    const parsed = TransferLeadershipSchema.safeParse(bodyJson);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid leadership transfer payload",
          code: "VALIDATION_ERROR",
          details: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    const updatedSquad = await TeamService.transferTeamLeadership(
      user.id,
      teamId,
      parsed.data.newLeaderPlayerId
    );

    return NextResponse.json({
      ok: true,
      data: updatedSquad,
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

    logger.error("Unexpected error transferring squad leadership", {
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      { error: "Failed to transfer squad leadership", code: "INTERNAL_SERVER_ERROR" },
      { status: 500 }
    );
  }
}
