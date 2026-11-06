import { NextRequest, NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/modules/authentication/guards/auth.guard";
import { BoardNodeService } from "@/modules/investigation-board/services/board-node.service";
import { CreateBoardNodeSchema } from "@/modules/investigation-board/validation/board.schema";
import { AppError } from "@/lib/errors/app-error";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

/**
 * POST /api/investigations/[investigationId]/board/nodes
 * Creates a new pin (evidence, character, note, event, location, theory) on the board.
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ investigationId: string }> }
): Promise<NextResponse> {
  try {
    const user = await requireAuthenticatedUser();
    const { investigationId } = await context.params;

    const body = await request.json().catch(() => ({}));
    const validated = CreateBoardNodeSchema.parse(body);

    const node = await BoardNodeService.createNode(user.id, investigationId, validated as any);

    return NextResponse.json(
      {
        ok: true,
        data: { node },
      },
      { status: 201 }
    );
  } catch (err: any) {
    if (err?.name === "ZodError") {
      return NextResponse.json(
        { error: "Invalid node payload", details: err.errors, code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    if (err instanceof AppError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.statusCode });
    }

    logger.error("Failed to create board node", { error: err.message });
    return NextResponse.json(
      { error: "Failed to create board node", code: "INTERNAL_SERVER_ERROR" },
      { status: 500 }
    );
  }
}

