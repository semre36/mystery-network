import { NextRequest, NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/modules/authentication/guards/auth.guard";
import { BoardNodeService } from "@/modules/investigation-board/services/board-node.service";
import { UpdateBoardNodeSchema } from "@/modules/investigation-board/validation/board.schema";
import { AppError } from "@/lib/errors/app-error";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/investigations/[investigationId]/board/nodes/[nodeId]
 * Updates a node's coordinates, dimensions, or text.
 */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ investigationId: string; nodeId: string }> }
): Promise<NextResponse> {
  try {
    const user = await requireAuthenticatedUser();
    const { investigationId, nodeId } = await context.params;

    const body = await request.json().catch(() => ({}));
    const validated = UpdateBoardNodeSchema.parse(body);

    const node = await BoardNodeService.updateNode(
      user.id,
      investigationId,
      nodeId,
      validated as any
    );

    return NextResponse.json({
      ok: true,
      data: { node },
    });
  } catch (err: any) {
    if (err?.name === "ZodError") {
      return NextResponse.json(
        { error: "Invalid node update payload", details: err.errors, code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    if (err instanceof AppError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.statusCode });
    }

    logger.error("Failed to update board node", { error: err.message });
    return NextResponse.json(
      { error: "Failed to update board node", code: "INTERNAL_SERVER_ERROR" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/investigations/[investigationId]/board/nodes/[nodeId]
 * Deletes a node pin from the board. Cascades to clean up edges.
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ investigationId: string; nodeId: string }> }
): Promise<NextResponse> {
  try {
    const user = await requireAuthenticatedUser();
    const { investigationId, nodeId } = await context.params;

    await BoardNodeService.deleteNode(user.id, investigationId, nodeId);

    return NextResponse.json({
      ok: true,
      data: { message: "Board pin deleted successfully" },
    });
  } catch (err: any) {
    if (err instanceof AppError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.statusCode });
    }

    logger.error("Failed to delete board node", { error: err.message });
    return NextResponse.json(
      { error: "Failed to delete board node", code: "INTERNAL_SERVER_ERROR" },
      { status: 500 }
    );
  }
}
