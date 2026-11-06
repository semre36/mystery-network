import { NextRequest, NextResponse } from "next/server";
import { AdminGuard } from "@/modules/administration/guards/admin.guard";
import { AdminContentService } from "@/modules/administration/services/admin-content.service";
import { UpdateClueSchema } from "@/modules/administration/validation/admin.schema";
import { AppError } from "@/lib/errors/app-error";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/admin/evidence/[clueId]
 */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ clueId: string }> }
): Promise<NextResponse> {
  try {
    const admin = await AdminGuard.requirePermission("EVIDENCE_UPDATE");
    const { clueId } = await context.params;

    const body = await request.json().catch(() => ({}));
    const validated = UpdateClueSchema.parse(body);

    const clue = await AdminContentService.updateClue(admin.userId, clueId, validated);

    return NextResponse.json({
      ok: true,
      data: { clue },
    });
  } catch (err: any) {
    if (err instanceof AppError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.statusCode });
    }

    logger.error("Failed to update clue", { error: err.message });
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_SERVER_ERROR" },
      { status: 500 }
    );
  }
}
