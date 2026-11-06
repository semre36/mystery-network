import { NextRequest, NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/modules/authentication/guards/auth.guard";
import { TheoryService } from "@/modules/investigation-board/services/theory.service";
import { CreateTheorySchema } from "@/modules/investigation-board/validation/board.schema";
import { AppError } from "@/lib/errors/app-error";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

/**
 * GET /api/investigations/[investigationId]/theories
 * Retrieves all investigation hypotheses with supporting/contradicting evidence counts.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ investigationId: string }> }
): Promise<NextResponse> {
  try {
    const user = await requireAuthenticatedUser();
    const { investigationId } = await context.params;

    const theories = await TheoryService.getTheories(user.id, investigationId);

    return NextResponse.json({
      ok: true,
      data: {
        theories,
        total: theories.length,
      },
    });
  } catch (err: any) {
    if (err instanceof AppError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.statusCode });
    }

    logger.error("Failed to retrieve investigation theories", { error: err.message });
    return NextResponse.json(
      { error: "Failed to retrieve investigation theories", code: "INTERNAL_SERVER_ERROR" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/investigations/[investigationId]/theories
 * Creates a new hypothesis/theory for the investigation.
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ investigationId: string }> }
): Promise<NextResponse> {
  try {
    const user = await requireAuthenticatedUser();
    const { investigationId } = await context.params;

    const body = await request.json().catch(() => ({}));
    const validated = CreateTheorySchema.parse(body);

    const theory = await TheoryService.createTheory(user.id, investigationId, validated as any);

    return NextResponse.json(
      {
        ok: true,
        data: { theory },
      },
      { status: 201 }
    );
  } catch (err: any) {
    if (err?.name === "ZodError") {
      return NextResponse.json(
        { error: "Invalid theory payload", details: err.errors, code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    if (err instanceof AppError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.statusCode });
    }

    logger.error("Failed to create theory", { error: err.message });
    return NextResponse.json(
      { error: "Failed to create theory", code: "INTERNAL_SERVER_ERROR" },
      { status: 500 }
    );
  }
}

