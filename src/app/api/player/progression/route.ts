import { NextRequest, NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/modules/authentication/guards/auth.guard";
import { ProgressionService } from "@/modules/progression/services/progression.service";
import { AppError } from "@/lib/errors/app-error";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

/**
 * GET /api/player/progression
 * Retrieves the authenticated operative's progression profile, XP details, and recent transactions.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const user = await requireAuthenticatedUser();

    const progression = await ProgressionService.getPlayerProgression(user.id);

    return NextResponse.json({
      ok: true,
      data: { progression },
    });
  } catch (err: any) {
    if (err instanceof AppError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.statusCode });
    }

    logger.error("Failed to retrieve player progression", { error: err.message });
    return NextResponse.json(
      { error: "Failed to retrieve player progression", code: "INTERNAL_SERVER_ERROR" },
      { status: 500 }
    );
  }
}
