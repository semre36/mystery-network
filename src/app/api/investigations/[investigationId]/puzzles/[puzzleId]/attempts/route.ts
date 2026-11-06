import { NextRequest, NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/modules/authentication/guards/auth.guard";
import { PuzzleService } from "@/modules/puzzles/services/puzzle.service";
import { SubmitPuzzleAttemptSchema } from "@/modules/puzzles/validation/puzzle.schema";
import { AppError } from "@/lib/errors/app-error";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

/**
 * GET /api/investigations/[investigationId]/puzzles/[puzzleId]/attempts
 * Retrieves attempt history for this challenge.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ investigationId: string; puzzleId: string }> }
): Promise<NextResponse> {
  try {
    const user = await requireAuthenticatedUser();
    const { investigationId, puzzleId } = await context.params;

    const data = await PuzzleService.getAttemptHistory(user.id, investigationId, puzzleId);

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

    logger.error("Failed to retrieve attempt history", { error: err.message });
    return NextResponse.json(
      {
        error: "Failed to retrieve attempt history",
        code: "INTERNAL_SERVER_ERROR",
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/investigations/[investigationId]/puzzles/[puzzleId]/attempts
 * Submits an answer attempt for server-side evaluation.
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ investigationId: string; puzzleId: string }> }
): Promise<NextResponse> {
  try {
    const user = await requireAuthenticatedUser();
    const { investigationId, puzzleId } = await context.params;

    const body = await request.json().catch(() => ({}));
    const parsed = SubmitPuzzleAttemptSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid submission data",
          code: "VALIDATION_ERROR",
          details: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    const data = await PuzzleService.submitAttempt(user.id, investigationId, puzzleId, parsed.data);

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

    logger.error("Failed to process puzzle attempt submission", { error: err.message });
    return NextResponse.json(
      {
        error: "Failed to evaluate challenge submission",
        code: "INTERNAL_SERVER_ERROR",
      },
      { status: 500 }
    );
  }
}
