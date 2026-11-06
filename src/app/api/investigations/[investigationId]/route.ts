import { NextRequest, NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/modules/authentication/guards/auth.guard";
import { InvestigationService } from "@/modules/investigations/services/investigation.service";
import { AppError } from "@/lib/errors/app-error";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ investigationId: string }> }
): Promise<NextResponse> {
  try {
    const user = await requireAuthenticatedUser();
    const { investigationId } = await context.params;

    if (!investigationId) {
      return NextResponse.json(
        { error: "Investigation ID is required", code: "MISSING_ID" },
        { status: 400 }
      );
    }

    const workspace = await InvestigationService.getInvestigationWorkspace(
      user.id,
      investigationId
    );

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

    logger.error("Unexpected error retrieving investigation workspace", {
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      {
        error: "Failed to access investigation session",
        code: "INTERNAL_SERVER_ERROR",
      },
      { status: 500 }
    );
  }
}
