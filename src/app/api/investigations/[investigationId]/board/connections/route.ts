import { NextRequest, NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/modules/authentication/guards/auth.guard";
import { BoardConnectionService } from "@/modules/investigation-board/services/board-connection.service";
import { CreateBoardConnectionSchema } from "@/modules/investigation-board/validation/board.schema";
import { AppError } from "@/lib/errors/app-error";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

/**
 * POST /api/investigations/[investigationId]/board/connections
 * Creates a relationship connection between two pins on the board.
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ investigationId: string }> }
): Promise<NextResponse> {
  try {
    const user = await requireAuthenticatedUser();
    const { investigationId } = await context.params;

    const body = await request.json().catch(() => ({}));
    const validated = CreateBoardConnectionSchema.parse(body);

    const connection = await BoardConnectionService.createConnection(
      user.id,
      investigationId,
      validated as any
    );

    return NextResponse.json(
      {
        ok: true,
        data: { connection },
      },
      { status: 201 }
    );
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

    logger.error("Failed to create board connection", { error: err.message });
    return NextResponse.json(
      { error: "Failed to create board connection", code: "INTERNAL_SERVER_ERROR" },
      { status: 500 }
    );
  }
}

