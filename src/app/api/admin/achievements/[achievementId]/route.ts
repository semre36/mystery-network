import { NextRequest, NextResponse } from "next/server";
import { AdminGuard } from "@/modules/administration/guards/admin.guard";
import { AdminRewardsService } from "@/modules/administration/services/admin-rewards.service";
import { UpdateAchievementSchema } from "@/modules/administration/validation/admin.schema";
import { AppError } from "@/lib/errors/app-error";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/admin/achievements/[achievementId]
 */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ achievementId: string }> }
): Promise<NextResponse> {
  try {
    const admin = await AdminGuard.requirePermission("ACHIEVEMENT_MANAGE");
    const { achievementId } = await context.params;

    const body = await request.json().catch(() => ({}));
    const validated = UpdateAchievementSchema.parse(body);

    const achievement = await AdminRewardsService.updateAchievement(
      admin.userId,
      achievementId,
      validated
    );

    return NextResponse.json({
      ok: true,
      data: { achievement },
    });
  } catch (err: any) {
    if (err instanceof AppError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.statusCode });
    }

    logger.error("Failed to update achievement", { error: err.message });
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_SERVER_ERROR" },
      { status: 500 }
    );
  }
}
