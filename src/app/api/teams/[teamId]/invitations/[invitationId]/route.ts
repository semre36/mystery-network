import { NextRequest, NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/modules/authentication/guards/auth.guard";
import { InvitationService } from "@/modules/teams/services/invitation.service";
import { AppError } from "@/lib/errors/app-error";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{
    teamId: string;
    invitationId: string;
  }>;
}

/**
 * DELETE /api/teams/[teamId]/invitations/[invitationId]
 * Revokes an active invitation. Authorized strictly for the Lead Investigator.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const user = await requireAuthenticatedUser();
    const { teamId, invitationId } = await params;

    const result = await InvitationService.revokeInvitation(user.id, teamId, invitationId);

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

    logger.error("Unexpected error revoking squad invitation", {
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      { error: "Failed to revoke invitation", code: "INTERNAL_SERVER_ERROR" },
      { status: 500 }
    );
  }
}
