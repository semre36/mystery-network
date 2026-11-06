import { NextResponse } from "next/server";
import { AdminGuard } from "@/modules/administration/guards/admin.guard";
import { AdminAnalyticsService } from "@/modules/administration/services/admin-analytics.service";
import { AppError } from "@/lib/errors/app-error";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/analytics
 */
export async function GET(): Promise<NextResponse> {
  try {
    await AdminGuard.requirePermission("ANALYTICS_VIEW");
    const analytics = await AdminAnalyticsService.getPlatformAnalytics();

    return NextResponse.json({
      ok: true,
      data: { analytics },
    });
  } catch (err: any) {
    if (err instanceof AppError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.statusCode });
    }

    logger.error("Failed to retrieve platform analytics", { error: err.message });
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_SERVER_ERROR" },
      { status: 500 }
    );
  }
}
