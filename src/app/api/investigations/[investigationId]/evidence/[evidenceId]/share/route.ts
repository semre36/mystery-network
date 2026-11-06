import { NextRequest, NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/modules/authentication/guards/auth.guard";
import { EvidenceService } from "@/modules/evidence/services/evidence.service";
import { ShareEvidenceSchema } from "@/modules/evidence/validation/evidence.schema";
import { AppError } from "@/lib/errors/app-error";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

/**
 * POST /api/investigations/[investigationId]/evidence/[evidenceId]/share
 * Explicitly shares eligible evidence with another active squad member.
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ investigationId: string; evidenceId: string }> }
): Promise<NextResponse> {
  try {
    const user = await requireAuthenticatedUser();
    const { investigationId, evidenceId } = await context.params;

    let bodyJson: unknown = {};
    const text = await request.text();
    if (text && text.trim().length > 0) {
      try {
        bodyJson = JSON.parse(text);
      } catch {
        return NextResponse.json(
          { error: "Malformed JSON payload", code: "INVALID_JSON" },
          { status: 400 }
        );
      }
    }

    const parsed = ShareEvidenceSchema.safeParse(bodyJson);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid share payload",
          code: "VALIDATION_ERROR",
          details: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    const data = await EvidenceService.shareEvidence(
      user.id,
      investigationId,
      evidenceId,
      parsed.data.recipientPlayerId
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

    logger.error("Failed to share evidence", {
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      {
        error: "Internal server error sharing evidence",
        code: "INTERNAL_ERROR",
      },
      { status: 500 }
    );
  }
}
