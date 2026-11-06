import { NextRequest, NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/modules/authentication/guards/auth.guard";
import { TheoryService } from "@/modules/investigation-board/services/theory.service";
import { UpdateTheorySchema } from "@/modules/investigation-board/validation/board.schema";
import { AppError } from "@/lib/errors/app-error";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

/**
 * GET /api/investigations/[investigationId]/theories/[theoryId]
 * Retrieves theory details and linked evidence items.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ investigationId: string; theoryId: string }> }
): Promise<NextResponse> {
  try {
    const user = await requireAuthenticatedUser();
    const { investigationId, theoryId } = await context.params;

    const theory = await TheoryService.getTheoryDetail(user.id, investigationId, theoryId);

    return NextResponse.json({
      ok: true,
      data: { theory },
    });
  } catch (err: any) {
    if (err instanceof AppError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.statusCode });
    }

    logger.error("Failed to retrieve theory detail", { error: err.message });
    return NextResponse.json(
      { error: "Failed to retrieve theory detail", code: "INTERNAL_SERVER_ERROR" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/investigations/[investigationId]/theories/[theoryId]
 * Updates title, description, or status of an investigation theory.
 */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ investigationId: string; theoryId: string }> }
): Promise<NextResponse> {
  try {
    const user = await requireAuthenticatedUser();
    const { investigationId, theoryId } = await context.params;

    const body = await request.json().catch(() => ({}));
    const validated = UpdateTheorySchema.parse(body);

    const theory = await TheoryService.updateTheory(
      user.id,
      investigationId,
      theoryId,
      validated as any
    );

    return NextResponse.json({
      ok: true,
      data: { theory },
    });
  } catch (err: any) {
    if (err?.name === "ZodError") {
      return NextResponse.json(
        { error: "Invalid theory update payload", details: err.errors, code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    if (err instanceof AppError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.statusCode });
    }

    logger.error("Failed to update theory", { error: err.message });
    return NextResponse.json(
      { error: "Failed to update theory", code: "INTERNAL_SERVER_ERROR" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/investigations/[investigationId]/theories/[theoryId]
 * Deletes a theory and cascades to clean up its evidence associations.
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ investigationId: string; theoryId: string }> }
): Promise<NextResponse> {
  try {
    const user = await requireAuthenticatedUser();
    const { investigationId, theoryId } = await context.params;

    await TheoryService.deleteTheory(user.id, investigationId, theoryId);

    return NextResponse.json({
      ok: true,
      data: { message: "Theory deleted successfully" },
    });
  } catch (err: any) {
    if (err instanceof AppError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.statusCode });
    }

    logger.error("Failed to delete theory", { error: err.message });
    return NextResponse.json(
      { error: "Failed to delete theory", code: "INTERNAL_SERVER_ERROR" },
      { status: 500 }
    );
  }
}

