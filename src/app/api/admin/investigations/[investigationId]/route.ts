import { NextRequest, NextResponse } from "next/server";
import { AdminGuard } from "@/modules/administration/guards/admin.guard";
import { AdminInvestigationService } from "@/modules/administration/services/admin-investigation.service";
import { InvestigationStatus } from "@prisma/client";
import { z } from "zod";
import { AppError } from "@/lib/errors/app-error";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

const UpdateInvestigationStatusSchema = z.object({
  status: z.nativeEnum(InvestigationStatus),
  reason: z.string().trim().max(300).optional(),
});

/**
 * GET /api/admin/investigations/[investigationId]
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ investigationId: string }> }
): Promise<NextResponse> {
  try {
    await AdminGuard.requirePermission("INVESTIGATION_VIEW");
    const { investigationId } = await context.params;

    const investigation = await AdminInvestigationService.getInvestigationDetail(investigationId);

    return NextResponse.json({
      ok: true,
      data: { investigation },
    });
  } catch (err: any) {
    if (err instanceof AppError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.statusCode });
    }

    logger.error("Failed to retrieve investigation detail", { error: err.message });
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_SERVER_ERROR" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/investigations/[investigationId]
 */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ investigationId: string }> }
): Promise<NextResponse> {
  try {
    const admin = await AdminGuard.requirePermission("INVESTIGATION_MANAGE");
    const { investigationId } = await context.params;

    const body = await request.json().catch(() => ({}));
    const validated = UpdateInvestigationStatusSchema.parse(body);

    const updated = await AdminInvestigationService.updateInvestigationStatus(
      admin.userId,
      investigationId,
      validated.status,
      validated.reason
    );

    return NextResponse.json({
      ok: true,
      data: { investigation: updated },
    });
  } catch (err: any) {
    if (err instanceof AppError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.statusCode });
    }

    logger.error("Failed to override investigation status", { error: err.message });
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_SERVER_ERROR" },
      { status: 500 }
    );
  }
}
