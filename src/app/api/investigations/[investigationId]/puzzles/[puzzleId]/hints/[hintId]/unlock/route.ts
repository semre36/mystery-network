import { NextRequest, NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/modules/authentication/guards/auth.guard";
import { PuzzleService } from "@/modules/puzzles/services/puzzle.service";
import { AppError } from "@/lib/errors/app-error";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

/**
 * POST /api/investigations/[investigationId]/puzzles/[puzzleId]/hints/[hintId]/unlock
 * Unlocks a progressive hint for this challenge.
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ investigationId: string; puzzleId: string; hintId: string }> }
): Promise<NextResponse> {
  try {
    const user = await requireAuthenticatedUser();
    const { investigationId, puzzleId, hintId } = await context.params;

    const data = await PuzzleService.unlockHint(user.id, investigationId, puzzleId, hintId);

    return NextResponse.json(
      {
        ok: true,
        data,
      },
      { status: 200 }
    );
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

    logger.error("Failed to unlock puzzle hint", { error: err.message });
    return NextResponse.json(
      {
        error: "Failed to unlock tactical hint",
        code: "INTERNAL_SERVER_ERROR",
      },
      { status: 500 }
    );
  }
}
