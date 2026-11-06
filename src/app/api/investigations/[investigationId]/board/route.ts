import { NextRequest, NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/modules/authentication/guards/auth.guard";
import { InvestigationBoardService } from "@/modules/investigation-board/services/investigation-board.service";
import { UpdateBoardViewportSchema } from "@/modules/investigation-board/validation/board.schema";
import { AppError } from "@/lib/errors/app-error";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

/**
 * GET /api/investigations/[investigationId]/board
 * Retrieves the persistent crime board for an investigation with hydrated pins and connections.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ investigationId: string }> }
): Promise<NextResponse> {
  try {
    const user = await requireAuthenticatedUser();
    const { investigationId } = await context.params;

    const board = await InvestigationBoardService.getOrCreateBoard(user.id, investigationId);

    return NextResponse.json({
      ok: true,
      data: { board },
    });
  } catch (err: any) {
    if (err instanceof AppError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.statusCode });
    }

    logger.error("Failed to load investigation board", { error: err.message });
    return NextResponse.json(
      { error: "Failed to load investigation board", code: "INTERNAL_SERVER_ERROR" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/investigations/[investigationId]/board
 * Updates viewport pan and zoom state.
 */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ investigationId: string }> }
): Promise<NextResponse> {
  try {
    const user = await requireAuthenticatedUser();
    const { investigationId } = await context.params;

    const body = await request.json().catch(() => ({}));
    const validated = UpdateBoardViewportSchema.parse(body);

    const viewport = await InvestigationBoardService.updateViewport(
      user.id,
      investigationId,
      validated
    );

    return NextResponse.json({
      ok: true,
      data: { viewport },
    });
  } catch (err: any) {
    if (err?.name === "ZodError") {
      return NextResponse.json(
        { error: "Invalid viewport coordinates", details: err.errors, code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    if (err instanceof AppError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.statusCode });
    }

    logger.error("Failed to update board viewport", { error: err.message });
    return NextResponse.json(
      { error: "Failed to update board viewport", code: "INTERNAL_SERVER_ERROR" },
      { status: 500 }
    );
  }
}

