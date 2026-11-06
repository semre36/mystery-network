import { NextRequest, NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/modules/authentication/guards/auth.guard";
import { TheoryService } from "@/modules/investigation-board/services/theory.service";
import { AddTheoryEvidenceSchema } from "@/modules/investigation-board/validation/board.schema";
import { AppError } from "@/lib/errors/app-error";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

/**
 * POST /api/investigations/[investigationId]/theories/[theoryId]/evidence
 * Links a declassified evidence item to a theory (SUPPORTS, CONTRADICTS, or NEUTRAL).
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ investigationId: string; theoryId: string }> }
): Promise<NextResponse> {
  try {
    const user = await requireAuthenticatedUser();
    const { investigationId, theoryId } = await context.params;

    const body = await request.json().catch(() => ({}));
    const validated = AddTheoryEvidenceSchema.parse(body);

    const association = await TheoryService.addTheoryEvidence(
      user.id,
      investigationId,
      theoryId,
      validated as any
    );

    return NextResponse.json(
      {
        ok: true,
        data: { association },
      },
      { status: 201 }
    );
  } catch (err: any) {
    if (err?.name === "ZodError") {
      return NextResponse.json(
        { error: "Invalid theory evidence payload", details: err.errors, code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    if (err instanceof AppError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.statusCode });
    }

    logger.error("Failed to associate evidence with theory", { error: err.message });
    return NextResponse.json(
      { error: "Failed to associate evidence with theory", code: "INTERNAL_SERVER_ERROR" },
      { status: 500 }
    );
  }
}

