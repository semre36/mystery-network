import { NextRequest, NextResponse } from "next/server";
import { AdminGuard } from "@/modules/administration/guards/admin.guard";
import { AdminInvestigationService } from "@/modules/administration/services/admin-investigation.service";
import { InvestigationStatus, PlayMode } from "@prisma/client";
import { AppError } from "@/lib/errors/app-error";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/investigations
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    await AdminGuard.requirePermission("INVESTIGATION_VIEW");

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const statusParam = searchParams.get("status") as InvestigationStatus | null;
    const playModeParam = searchParams.get("playMode") as PlayMode | null;
    const caseId = searchParams.get("caseId") || undefined;

    const result = await AdminInvestigationService.listInvestigations({
      page,
      limit,
      status:
        statusParam && Object.values(InvestigationStatus).includes(statusParam)
          ? statusParam
          : undefined,
      playMode:
        playModeParam && Object.values(PlayMode).includes(playModeParam)
          ? playModeParam
          : undefined,
      caseId,
    });

    return NextResponse.json({
      ok: true,
      data: result,
    });
  } catch (err: any) {
    if (err instanceof AppError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.statusCode });
    }

    logger.error("Failed to list investigations", { error: err.message });
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_SERVER_ERROR" },
      { status: 500 }
    );
  }
}
