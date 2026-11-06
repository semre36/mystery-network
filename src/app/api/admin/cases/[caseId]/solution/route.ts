import { NextRequest, NextResponse } from "next/server";
import { AdminGuard } from "@/modules/administration/guards/admin.guard";
import { AdminContentService } from "@/modules/administration/services/admin-content.service";
import { CaseSolutionConfigSchema } from "@/modules/administration/validation/admin.schema";
import { AppError } from "@/lib/errors/app-error";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/cases/[caseId]/solution
 * Strictly requires CASE_MANAGE_SOLUTION permission.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ caseId: string }> }
): Promise<NextResponse> {
  try {
    await AdminGuard.requirePermission("CASE_MANAGE_SOLUTION");
    const { caseId } = await context.params;

    const caseData = await AdminContentService.getCaseDetail(caseId, true);

    return NextResponse.json({
      ok: true,
      data: { solutionConfig: (caseData as any).solutionConfig || null },
    });
  } catch (err: any) {
    if (err instanceof AppError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.statusCode });
    }

    logger.error("Failed to retrieve case solution config", { error: err.message });
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_SERVER_ERROR" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/cases/[caseId]/solution
 * Updates the secret solution configuration with full validation.
 * Strictly requires CASE_MANAGE_SOLUTION permission.
 */
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ caseId: string }> }
): Promise<NextResponse> {
  try {
    const admin = await AdminGuard.requirePermission("CASE_MANAGE_SOLUTION");
    const { caseId } = await context.params;

    const body = await request.json().catch(() => ({}));
    const validated = CaseSolutionConfigSchema.parse(body);

    const solutionConfig = await AdminContentService.updateCaseSolutionConfig(
      admin.userId,
      caseId,
      validated as any
    );

    return NextResponse.json({
      ok: true,
      data: { solutionConfig },
    });
  } catch (err: any) {
    if (err instanceof AppError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.statusCode });
    }

    logger.error("Failed to update case solution config", { error: err.message });
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_SERVER_ERROR" },
      { status: 500 }
    );
  }
}
