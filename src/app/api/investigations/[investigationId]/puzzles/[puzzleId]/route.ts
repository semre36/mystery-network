import { NextRequest, NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/modules/authentication/guards/auth.guard";
import { PuzzleService } from "@/modules/puzzles/services/puzzle.service";
import { AppError } from "@/lib/errors/app-error";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

/**
 * GET /api/investigations/[investigationId]/puzzles/[puzzleId]
 * Retrieves sanitized puzzle detail, current stage, attempt counts, and hints.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ investigationId: string; puzzleId: string }> }
): Promise<NextResponse> {
  try {
    const user = await requireAuthenticatedUser();
    const { investigationId, puzzleId } = await context.params;

    const data = await PuzzleService.getPuzzleDetail(user.id, investigationId, puzzleId);

    return NextResponse.json({
      ok: true,
      data,
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

    logger.error("Failed to retrieve puzzle details", { error: err.message });
    return NextResponse.json(
      {
        error: "Failed to retrieve challenge workspace",
        code: "INTERNAL_SERVER_ERROR",
      },
      { status: 500 }
    );
  }
}
