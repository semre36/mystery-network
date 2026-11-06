import { NextRequest, NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/modules/authentication/guards/auth.guard";
import { BoardConnectionService } from "@/modules/investigation-board/services/board-connection.service";
import { UpdateBoardConnectionSchema } from "@/modules/investigation-board/validation/board.schema";
import { AppError } from "@/lib/errors/app-error";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/investigations/[investigationId]/board/connections/[connectionId]
 * Updates a connection's label, explanation, or relationship type.
 */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ investigationId: string; connectionId: string }> }
): Promise<NextResponse> {
  try {
    const user = await requireAuthenticatedUser();
    const { investigationId, connectionId } = await context.params;

    const body = await request.json().catch(() => ({}));
    const validated = UpdateBoardConnectionSchema.parse(body);

    const connection = await BoardConnectionService.updateConnection(
      user.id,
      investigationId,
      connectionId,
      validated as any
    );

    return NextResponse.json({
      ok: true,
      data: { connection },
    });
  } catch (err: any) {
    if (err?.name === "ZodError") {
      return NextResponse.json(
        { error: "Invalid connection payload", details: err.errors, code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    if (err instanceof AppError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.statusCode });
    }

    logger.error("Failed to update board connection", { error: err.message });
    return NextResponse.json(
      { error: "Failed to update board connection", code: "INTERNAL_SERVER_ERROR" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/investigations/[investigationId]/board/connections/[connectionId]
 * Deletes a relationship connection from the board.
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ investigationId: string; connectionId: string }> }
): Promise<NextResponse> {
  try {
    const user = await requireAuthenticatedUser();
    const { investigationId, connectionId } = await context.params;

    await BoardConnectionService.deleteConnection(user.id, investigationId, connectionId);

    return NextResponse.json({
      ok: true,
      data: { message: "Connection removed successfully" },
    });
  } catch (err: any) {
    if (err instanceof AppError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.statusCode });
    }

    logger.error("Failed to delete board connection", { error: err.message });
    return NextResponse.json(
      { error: "Failed to delete board connection", code: "INTERNAL_SERVER_ERROR" },
      { status: 500 }
    );
  }
}

