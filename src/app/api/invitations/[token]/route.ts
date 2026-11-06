import { NextRequest, NextResponse } from "next/server";
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
 * GET /api/invitations/[token]
 * Public invitation preview. Never leaks internal secrets, hashes, or full squad rosters.
 */
export async function GET(_request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  try {
    const { token } = await params;

    const preview = await InvitationService.getInvitationPreview(token);

    return NextResponse.json({
      ok: true,
      data: preview,
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

    logger.error("Unexpected error retrieving invitation preview", {
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      { error: "Failed to preview invitation", code: "INTERNAL_SERVER_ERROR" },
      { status: 500 }
    );
  }
}
