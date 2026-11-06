import { NextRequest, NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/modules/authentication/guards/auth.guard";
import { InvestigationService } from "@/modules/investigations/services/investigation.service";
import { AppError } from "@/lib/errors/app-error";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{
    investigationId: string;
  }>;
}

/**
 * POST /api/investigations/[investigationId]/join
 * Enrolls an authenticated active squad member into an ongoing cooperative squad investigation.
 */
export async function POST(_request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  try {
    const user = await requireAuthenticatedUser();
    const { investigationId } = await params;

    const workspace = await InvestigationService.joinTeamInvestigation(user.id, investigationId);

    return NextResponse.json({
      ok: true,
      data: workspace,
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

    logger.error("Unexpected error joining squad investigation", {
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      {
        error: "Failed to join squad investigation session",
        code: "INTERNAL_SERVER_ERROR",
      },
      { status: 500 }
    );
  }
}
