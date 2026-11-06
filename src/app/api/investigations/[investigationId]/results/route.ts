import { NextRequest, NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/modules/authentication/guards/auth.guard";
import { SubmissionService } from "@/modules/submissions/services/submission.service";
import { AppError } from "@/lib/errors/app-error";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

/**
 * GET /api/investigations/[investigationId]/results
 * Retrieves complete evaluation results, score dimensions, and feedback for an investigation.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ investigationId: string }> }
): Promise<NextResponse> {
  try {
    const user = await requireAuthenticatedUser();
    const { investigationId } = await context.params;

    const results = await SubmissionService.getInvestigationResults(investigationId, user.id);

    return NextResponse.json({
      ok: true,
      data: results,
    });
  } catch (err: any) {
    if (err instanceof AppError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.statusCode });
    }

    logger.error("Failed to retrieve investigation results", { error: err.message });
    return NextResponse.json(
      { error: "Failed to retrieve investigation results", code: "INTERNAL_SERVER_ERROR" },
      { status: 500 }
    );
  }
}
