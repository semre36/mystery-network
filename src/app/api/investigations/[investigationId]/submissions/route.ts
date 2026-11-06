import { NextRequest, NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/modules/authentication/guards/auth.guard";
import { SubmissionService } from "@/modules/submissions/services/submission.service";
import { SaveSubmissionDraftSchema } from "@/modules/submissions/validation/submission.schema";
import { AppError } from "@/lib/errors/app-error";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

/**
 * GET /api/investigations/[investigationId]/submissions
 * Retrieves current case submission or draft for the active investigation.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ investigationId: string }> }
): Promise<NextResponse> {
  try {
    const user = await requireAuthenticatedUser();
    const { investigationId } = await context.params;

    const submission = await SubmissionService.getSubmission(investigationId, user.id);

    return NextResponse.json({
      ok: true,
      data: { submission },
    });
  } catch (err: any) {
    if (err instanceof AppError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.statusCode });
    }

    logger.error("Failed to retrieve investigation submission", { error: err.message });
    return NextResponse.json(
      { error: "Failed to retrieve investigation submission", code: "INTERNAL_SERVER_ERROR" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/investigations/[investigationId]/submissions
 * Saves or updates a draft case theory / indictment.
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ investigationId: string }> }
): Promise<NextResponse> {
  try {
    const user = await requireAuthenticatedUser();
    const { investigationId } = await context.params;

    const body = await request.json().catch(() => ({}));
    const validated = SaveSubmissionDraftSchema.parse(body);

    const submission = await SubmissionService.saveDraft(investigationId, user.id, validated);

    return NextResponse.json({
      ok: true,
      data: { submission },
    });
  } catch (err: any) {
    if (err.name === "ZodError") {
      return NextResponse.json(
        { error: "Validation failed", code: "VALIDATION_ERROR", details: err.errors },
        { status: 400 }
      );
    }

    if (err instanceof AppError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.statusCode });
    }

    logger.error("Failed to save submission draft", { error: err.message });
    return NextResponse.json(
      { error: "Failed to save submission draft", code: "INTERNAL_SERVER_ERROR" },
      { status: 500 }
    );
  }
}

