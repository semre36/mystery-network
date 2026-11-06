import { NextRequest, NextResponse } from "next/server";
import { AdminGuard } from "@/modules/administration/guards/admin.guard";
import { AdminRewardsService } from "@/modules/administration/services/admin-rewards.service";
import { CreateAchievementSchema } from "@/modules/administration/validation/admin.schema";
import { AppError } from "@/lib/errors/app-error";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/achievements
 */
export async function GET(): Promise<NextResponse> {
  try {
    await AdminGuard.requirePermission("ACHIEVEMENT_MANAGE");
    const achievements = await AdminRewardsService.listAchievements();

    return NextResponse.json({
      ok: true,
      data: { achievements },
    });
  } catch (err: any) {
    if (err instanceof AppError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.statusCode });
    }

    logger.error("Failed to list achievements", { error: err.message });
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_SERVER_ERROR" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/achievements
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const admin = await AdminGuard.requirePermission("ACHIEVEMENT_MANAGE");
    const body = await request.json().catch(() => ({}));
    const validated = CreateAchievementSchema.parse(body);

    const achievement = await AdminRewardsService.createAchievement(admin.userId, validated);

    return NextResponse.json({
      ok: true,
      data: { achievement },
    });
  } catch (err: any) {
    if (err instanceof AppError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.statusCode });
    }

    logger.error("Failed to create achievement", { error: err.message });
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_SERVER_ERROR" },
      { status: 500 }
    );
  }
}
