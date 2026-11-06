import { NextRequest, NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/modules/authentication/guards/auth.guard";
import { InvitationService } from "@/modules/teams/services/invitation.service";
import { CreateInvitationSchema } from "@/modules/teams/validation/team.schema";
import { AppError } from "@/lib/errors/app-error";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{
    teamId: string;
  }>;
}

/**
 * GET /api/teams/[teamId]/invitations
 * Retrieves all invitations dispatched for a squad. Authorized strictly for the Lead Investigator.
 */
export async function GET(_request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  try {
    const user = await requireAuthenticatedUser();
    const { teamId } = await params;

    const invitations = await InvitationService.getTeamInvitations(user.id, teamId);

    return NextResponse.json({
      ok: true,
      data: invitations,
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

    logger.error("Unexpected error retrieving squad invitations", {
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      { error: "Failed to retrieve invitations", code: "INTERNAL_SERVER_ERROR" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/teams/[teamId]/invitations
 * Dispatches a cryptographically secure, time-limited squad invitation token.
 * Authorized strictly for the Lead Investigator.
 */
export async function POST(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  try {
    const user = await requireAuthenticatedUser();
    const { teamId } = await params;

    let bodyJson: unknown = {};
    try {
      const text = await request.text();
      if (text) {
        bodyJson = JSON.parse(text);
      }
    } catch {
      return NextResponse.json(
        { error: "Malformed JSON payload", code: "INVALID_JSON" },
        { status: 400 }
      );
    }

    const parsed = CreateInvitationSchema.safeParse(bodyJson);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid invitation dispatch parameters",
          code: "VALIDATION_ERROR",
          details: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    const result = await InvitationService.createInvitation(user.id, teamId, parsed.data);

    return NextResponse.json(
      {
        ok: true,
        data: {
          invitation: result.invitation,
          rawToken: result.rawToken,
          inviteLink: `/invitations/${result.rawToken}`,
        },
      },
      { status: 201 }
    );
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

    logger.error("Unexpected error creating squad invitation", {
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      { error: "Failed to create squad invitation", code: "INTERNAL_SERVER_ERROR" },
      { status: 500 }
    );
  }
}
