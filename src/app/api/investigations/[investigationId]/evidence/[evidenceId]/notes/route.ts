import { NextRequest, NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/modules/authentication/guards/auth.guard";
import { EvidenceService } from "@/modules/evidence/services/evidence.service";
import { SaveEvidenceNoteSchema } from "@/modules/evidence/validation/evidence.schema";
import { AppError } from "@/lib/errors/app-error";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

/**
 * POST /api/investigations/[investigationId]/evidence/[evidenceId]/notes
 * Creates or updates private investigator annotation.
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ investigationId: string; evidenceId: string }> }
): Promise<NextResponse> {
  return handleSaveNote(request, context);
}

/**
 * PATCH /api/investigations/[investigationId]/evidence/[evidenceId]/notes
 * Updates private investigator annotation.
 */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ investigationId: string; evidenceId: string }> }
): Promise<NextResponse> {
  return handleSaveNote(request, context);
}

async function handleSaveNote(
  request: NextRequest,
  context: { params: Promise<{ investigationId: string; evidenceId: string }> }
): Promise<NextResponse> {
  try {
    const user = await requireAuthenticatedUser();
    const { investigationId, evidenceId } = await context.params;

    let bodyJson: unknown;
    try {
      bodyJson = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Malformed JSON payload", code: "INVALID_JSON" },
        { status: 400 }
      );
    }

    const parsed = SaveEvidenceNoteSchema.safeParse(bodyJson);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid note payload",
          code: "VALIDATION_ERROR",
          details: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    const data = await EvidenceService.saveEvidenceNote(
      user.id,
      investigationId,
      evidenceId,
      parsed.data.content
    );

    return NextResponse.json({
      ok: true,
      data,
    });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json(
        {
          error: error.message,
          code: error.code,
        },
        { status: error.statusCode }
      );
    }

    logger.error("Failed to save evidence note", {
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      {
        error: "Internal server error saving evidence note",
        code: "INTERNAL_ERROR",
      },
      { status: 500 }
    );
  }
}
