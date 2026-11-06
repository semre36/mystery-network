import { NextRequest, NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/modules/authentication/guards/auth.guard";
import { EvidenceService } from "@/modules/evidence/services/evidence.service";
import { AppError } from "@/lib/errors/app-error";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

/**
 * GET /api/investigations/[investigationId]/evidence/[evidenceId]
 * Retrieves classified detail dossier for single evidence.
 * Marks UNSEEN evidence as VIEWED upon inspection.
 */
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ investigationId: string; evidenceId: string }> }
): Promise<NextResponse> {
  try {
    const user = await requireAuthenticatedUser();
    const { investigationId, evidenceId } = await context.params;

    const data = await EvidenceService.getEvidenceDetail(user.id, investigationId, evidenceId);

    return NextResponse.json({
      ok: true,
      data,
    });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json(
        {
          error: error.message,
          code: error.code,
        },
        { status: error.statusCode }
      );
    }

    logger.error("Failed to inspect evidence detail", {
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      {
        error: "Internal server error inspecting evidence",
        code: "INTERNAL_ERROR",
      },
      { status: 500 }
    );
  }
}
