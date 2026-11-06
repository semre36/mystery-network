import { NextRequest, NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/modules/authentication/guards/auth.guard";
import { SubmissionService } from "@/modules/submissions/services/submission.service";
import { FinalSubmissionSchema } from "@/modules/submissions/validation/submission.schema";
import { AppError } from "@/lib/errors/app-error";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

/**
 * POST /api/investigations/[investigationId]/submissions/submit
 * Formally submits the final case theory and immediately triggers deterministic evaluation.
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ investigationId: string }> }
): Promise<NextResponse> {
  try {
    const user = await requireAuthenticatedUser();
    const { investigationId } = await context.params;

    const body = await request.json().catch(() => ({}));
    const validated = FinalSubmissionSchema.parse(body);

    const result = await SubmissionService.submitFinalIndictment(
      investigationId,
      user.id,
      validated
    );

    return NextResponse.json({
      ok: true,
      data: result,
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

    logger.error("Failed to submit case indictment", { error: err.message });
    return NextResponse.json(
      { error: "Failed to submit case indictment", code: "INTERNAL_SERVER_ERROR" },
      { status: 500 }
    );
  }
}
