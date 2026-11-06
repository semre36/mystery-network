import { NextRequest, NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/modules/authentication/guards/auth.guard";
import { EvidenceService } from "@/modules/evidence/services/evidence.service";
import { EvidenceQuerySchema } from "@/modules/evidence/validation/evidence.schema";
import { AppError } from "@/lib/errors/app-error";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

/**
 * GET /api/investigations/[investigationId]/evidence
 * Retrieves all evidence available to the authenticated investigator.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ investigationId: string }> }
): Promise<NextResponse> {
  try {
    const user = await requireAuthenticatedUser();
    const { investigationId } = await context.params;

    const { searchParams } = new URL(request.url);
    const rawQuery: Record<string, string | undefined> = {};

    if (searchParams.has("type")) rawQuery.type = searchParams.get("type")!;
    if (searchParams.has("chapterId")) rawQuery.chapterId = searchParams.get("chapterId")!;
    if (searchParams.has("search")) rawQuery.search = searchParams.get("search")!;
    if (searchParams.has("scope")) rawQuery.scope = searchParams.get("scope")!;
    if (searchParams.has("page")) rawQuery.page = searchParams.get("page")!;
    if (searchParams.has("limit")) rawQuery.limit = searchParams.get("limit")!;

    const parsed = EvidenceQuerySchema.safeParse(rawQuery);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid evidence query parameters",
          code: "VALIDATION_ERROR",
          details: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    const data = await EvidenceService.getInvestigationEvidence(
      user.id,
      investigationId,
      parsed.data
    );

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

    logger.error("Failed to fetch investigation evidence", {
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      {
        error: "Internal server error fetching evidence archive",
        code: "INTERNAL_ERROR",
      },
      { status: 500 }
    );
  }
}
