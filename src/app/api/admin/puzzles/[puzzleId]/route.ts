import { NextRequest, NextResponse } from "next/server";
import { AdminGuard } from "@/modules/administration/guards/admin.guard";
import { AdminContentService } from "@/modules/administration/services/admin-content.service";
import { UpdatePuzzleSchema } from "@/modules/administration/validation/admin.schema";
import { AppError } from "@/lib/errors/app-error";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/puzzles/[puzzleId]
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ puzzleId: string }> }
): Promise<NextResponse> {
  try {
    const admin = await AdminGuard.requirePermission("PUZZLE_VIEW");
    const { puzzleId } = await context.params;

    const canViewSecrets = admin.isSuperAdmin || admin.permissions.has("PUZZLE_MANAGE_SECRET");
    const puzzle = await AdminContentService.getPuzzleDetail(puzzleId, canViewSecrets);

    return NextResponse.json({
      ok: true,
      data: { puzzle },
    });
  } catch (err: any) {
    if (err instanceof AppError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.statusCode });
    }

    logger.error("Failed to retrieve puzzle detail", { error: err.message });
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_SERVER_ERROR" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/puzzles/[puzzleId]
 */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ puzzleId: string }> }
): Promise<NextResponse> {
  try {
    const admin = await AdminGuard.requirePermission("PUZZLE_UPDATE");
    const { puzzleId } = await context.params;

    const body = await request.json().catch(() => ({}));
    const validated = UpdatePuzzleSchema.parse(body);

    const puzzle = await AdminContentService.updatePuzzle(admin.userId, puzzleId, validated);

    return NextResponse.json({
      ok: true,
      data: { puzzle },
    });
  } catch (err: any) {
    if (err instanceof AppError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.statusCode });
    }

    logger.error("Failed to update puzzle", { error: err.message });
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_SERVER_ERROR" },
      { status: 500 }
    );
  }
}
