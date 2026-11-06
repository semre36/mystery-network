import { NextRequest, NextResponse } from "next/server";
import { AdminGuard } from "@/modules/administration/guards/admin.guard";
import { AdminContentService } from "@/modules/administration/services/admin-content.service";
import { UpdateCaseSchema } from "@/modules/administration/validation/admin.schema";
import { AppError } from "@/lib/errors/app-error";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/cases/[caseId]
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ caseId: string }> }
): Promise<NextResponse> {
  try {
    const admin = await AdminGuard.requirePermission("CASE_VIEW");
    const { caseId } = await context.params;

    // Check if caller is authorized to view protected secret solution and puzzle secrets
    const canViewSecrets = admin.isSuperAdmin || admin.permissions.has("CASE_MANAGE_SOLUTION");
    const canViewPuzzleSecrets =
      admin.isSuperAdmin || admin.permissions.has("PUZZLE_MANAGE_SECRET");
    const caseData = await AdminContentService.getCaseDetail(
      caseId,
      canViewSecrets,
      canViewPuzzleSecrets
    );

    return NextResponse.json({
      ok: true,
      data: { case: caseData },
    });
  } catch (err: any) {
    if (err instanceof AppError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.statusCode });
    }

    logger.error("Failed to retrieve case detail", { error: err.message });
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_SERVER_ERROR" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/cases/[caseId]
 */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ caseId: string }> }
): Promise<NextResponse> {
  try {
    const admin = await AdminGuard.requireAnyPermission([
      "CASE_UPDATE",
      "CASE_PUBLISH",
      "CASE_ARCHIVE",
    ]);
    const { caseId } = await context.params;

    const body = await request.json().catch(() => ({}));
    const validated = UpdateCaseSchema.parse(body);

    const updated = await AdminContentService.updateCase(admin.userId, caseId, validated);

    return NextResponse.json({
      ok: true,
      data: { case: updated },
    });
  } catch (err: any) {
    if (err instanceof AppError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.statusCode });
    }

    logger.error("Failed to update case", { error: err.message });
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_SERVER_ERROR" },
      { status: 500 }
    );
  }
}
