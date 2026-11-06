import { NextRequest, NextResponse } from "next/server";
import { AdminGuard } from "@/modules/administration/guards/admin.guard";
import { AdminRewardsService } from "@/modules/administration/services/admin-rewards.service";
import { AppError } from "@/lib/errors/app-error";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/rewards/transactions
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    await AdminGuard.requirePermission("REWARD_MANAGE");

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "25", 10);
    const playerId = searchParams.get("playerId") || undefined;

    const result = await AdminRewardsService.listXPTransactions({ page, limit, playerId });

    return NextResponse.json({
      ok: true,
      data: result,
    });
  } catch (err: any) {
    if (err instanceof AppError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.statusCode });
    }

    logger.error("Failed to list XP transactions", { error: err.message });
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_SERVER_ERROR" },
      { status: 500 }
    );
  }
}
