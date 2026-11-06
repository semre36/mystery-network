import { NextRequest, NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/modules/authentication/guards/auth.guard";
import { InvitationService } from "@/modules/teams/services/invitation.service";
import { AppError } from "@/lib/errors/app-error";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{
    token: string;
  }>;
}

/**
 * POST /api/invitations/[token]/decline
 * Declines the squad invitation.
 */
export async function POST(_request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  try {
    const user = await requireAuthenticatedUser();
    const { token } = await params;

    const result = await InvitationService.declineInvitation(user.id, token);

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

    logger.error("Unexpected error declining squad invitation", {
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      { error: "Failed to decline squad invitation", code: "INTERNAL_SERVER_ERROR" },
      { status: 500 }
    );
  }
}
