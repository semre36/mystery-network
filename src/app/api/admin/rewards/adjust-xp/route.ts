import { NextRequest, NextResponse } from "next/server";
import { AdminGuard } from "@/modules/administration/guards/admin.guard";
import { AdminRewardsService } from "@/modules/administration/services/admin-rewards.service";
import { AdjustXPSchema } from "@/modules/administration/validation/admin.schema";
import { AppError } from "@/lib/errors/app-error";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/rewards/adjust-xp
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const admin = await AdminGuard.requirePermission("REWARD_MANAGE");

    const body = await request.json().catch(() => ({}));
    const validated = AdjustXPSchema.parse(body);

    const result = await AdminRewardsService.adjustPlayerXP(admin.userId, validated);

    return NextResponse.json({
      ok: true,
      data: result,
      message: `Adjusted ${validated.amount > 0 ? "+" : ""}${validated.amount} XP successfully`,
    });
  } catch (err: any) {
    if (err instanceof AppError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.statusCode });
    }

    logger.error("Failed to adjust player XP", { error: err.message });
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_SERVER_ERROR" },
      { status: 500 }
    );
  }
}
