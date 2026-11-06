import { NextRequest, NextResponse } from "next/server";
import { AdminGuard } from "@/modules/administration/guards/admin.guard";
import { AdminContentService } from "@/modules/administration/services/admin-content.service";
import { CreateClueSchema } from "@/modules/administration/validation/admin.schema";
import { AppError } from "@/lib/errors/app-error";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/evidence
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const admin = await AdminGuard.requirePermission("EVIDENCE_CREATE");
    const body = await request.json().catch(() => ({}));
    const validated = CreateClueSchema.parse(body);

    const clue = await AdminContentService.createClue(admin.userId, validated);

    return NextResponse.json({
      ok: true,
      data: { clue },
    });
  } catch (err: any) {
    if (err instanceof AppError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.statusCode });
    }

    logger.error("Failed to create clue", { error: err.message });
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_SERVER_ERROR" },
      { status: 500 }
    );
  }
}
