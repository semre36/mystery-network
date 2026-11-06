import { NextRequest, NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/modules/authentication/guards/auth.guard";
import { ProgressionService } from "@/modules/progression/services/progression.service";
import { AppError } from "@/lib/errors/app-error";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

/**
 * GET /api/player/achievements
 * Retrieves the full achievements catalog with the operative's unlock state.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const user = await requireAuthenticatedUser();

    const achievements = await ProgressionService.getPlayerAchievements(user.id);

    return NextResponse.json({
      ok: true,
      data: { achievements },
    });
  } catch (err: any) {
    if (err instanceof AppError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.statusCode });
    }

    logger.error("Failed to retrieve player achievements", { error: err.message });
    return NextResponse.json(
      { error: "Failed to retrieve player achievements", code: "INTERNAL_SERVER_ERROR" },
      { status: 500 }
    );
  }
}

