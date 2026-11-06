import { NextRequest, NextResponse } from "next/server";
import { CaseService } from "@/modules/cases/services/case.service";
import { AppError } from "@/lib/errors/app-error";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ caseId: string }> }
): Promise<NextResponse> {
  try {
    const { caseId } = await context.params;

    if (!caseId) {
      return NextResponse.json(
        {
          error: "Case identifier is required",
          code: "MISSING_CASE_IDENTIFIER",
        },
        { status: 400 }
      );
    }

    const caseDetail = await CaseService.getCaseByIdOrCode(caseId);

    return NextResponse.json({
      ok: true,
      data: caseDetail,
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

    logger.error("Unexpected error retrieving case dossier", {
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      {
        error: "Failed to retrieve case dossier",
        code: "INTERNAL_SERVER_ERROR",
      },
      { status: 500 }
    );
  }
}
