import { NextRequest, NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/modules/authentication/guards/auth.guard";
import { PuzzleService } from "@/modules/puzzles/services/puzzle.service";
import { AppError } from "@/lib/errors/app-error";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

/**
 * GET /api/investigations/[investigationId]/puzzles
 * Retrieves all challenges for an investigation session with caller/investigation progress.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ investigationId: string }> }
): Promise<NextResponse> {
  try {
    const user = await requireAuthenticatedUser();
    const { investigationId } = await context.params;

    const puzzles = await PuzzleService.getPuzzles(user.id, investigationId);

    return NextResponse.json({
      ok: true,
      data: {
        puzzles,
        total: puzzles.length,
      },
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

    logger.error("Failed to retrieve investigation puzzles", { error: err.message });
    return NextResponse.json(
      {
        error: "Failed to retrieve investigation challenges",
        code: "INTERNAL_SERVER_ERROR",
      },
      { status: 500 }
    );
  }
}
