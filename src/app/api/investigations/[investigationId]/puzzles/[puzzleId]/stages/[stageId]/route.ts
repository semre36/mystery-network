import { NextRequest, NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/modules/authentication/guards/auth.guard";
import { PuzzleService } from "@/modules/puzzles/services/puzzle.service";
import { AppError } from "@/lib/errors/app-error";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

/**
 * GET /api/investigations/[investigationId]/puzzles/[puzzleId]/stages/[stageId]
 * Retrieves specific stage information if unlocked.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ investigationId: string; puzzleId: string; stageId: string }> }
): Promise<NextResponse> {
  try {
    const user = await requireAuthenticatedUser();
    const { investigationId, puzzleId, stageId } = await context.params;

    const puzzleDetail = await PuzzleService.getPuzzleDetail(user.id, investigationId, puzzleId);
    const stage = puzzleDetail.stages.find((s) => s.id === stageId);

    if (!stage) {
      return NextResponse.json(
        { error: "Stage not found", code: "STAGE_NOT_FOUND" },
        { status: 404 }
      );
    }

    if (stage.isLocked) {
      return NextResponse.json(
        { error: "Stage is currently locked", code: "STAGE_LOCKED" },
        { status: 403 }
      );
    }

    return NextResponse.json({
      ok: true,
      data: stage,
    });
  } catch (err: any) {
    if (err instanceof AppError) {
      return NextResponse.json(
        {
          error: err.message,
          code: err.code,
        },
        { status: err.statusCode }
      );
    }

    logger.error("Failed to retrieve puzzle stage", { error: err.message });
    return NextResponse.json(
      {
        error: "Failed to retrieve stage details",
        code: "INTERNAL_SERVER_ERROR",
      },
      { status: 500 }
    );
  }
}
