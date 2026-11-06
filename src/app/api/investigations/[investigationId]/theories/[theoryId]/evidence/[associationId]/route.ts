import { NextRequest, NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/modules/authentication/guards/auth.guard";
import { TheoryService } from "@/modules/investigation-board/services/theory.service";
import { AppError } from "@/lib/errors/app-error";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

/**
 * DELETE /api/investigations/[investigationId]/theories/[theoryId]/evidence/[associationId]
 * Removes an evidence association from a theory.
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ investigationId: string; theoryId: string; associationId: string }> }
): Promise<NextResponse> {
  try {
    const user = await requireAuthenticatedUser();
    const { investigationId, theoryId, associationId } = await context.params;

    await TheoryService.removeTheoryEvidence(user.id, investigationId, theoryId, associationId);

    return NextResponse.json({
      ok: true,
      data: { message: "Evidence association removed successfully" },
    });
  } catch (err: any) {
    if (err instanceof AppError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.statusCode });
    }

    logger.error("Failed to remove theory evidence association", { error: err.message });
    return NextResponse.json(
      { error: "Failed to remove theory evidence association", code: "INTERNAL_SERVER_ERROR" },
      { status: 500 }
    );
  }
}

