import { NextRequest, NextResponse } from "next/server";
import { AdminGuard } from "@/modules/administration/guards/admin.guard";
import { AdminAnalyticsService } from "@/modules/administration/services/admin-analytics.service";
import { AppError } from "@/lib/errors/app-error";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/dashboard
 * Retrieves operational dashboard metrics backed by live database records.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    await AdminGuard.requirePermission("DASHBOARD_VIEW");

    const metrics = await AdminAnalyticsService.getDashboardMetrics();

    return NextResponse.json({
      ok: true,
      data: { metrics },
    });
  } catch (err: any) {
    if (err instanceof AppError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.statusCode });
    }

    logger.error("Failed to retrieve admin dashboard metrics", { error: err.message });
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_SERVER_ERROR" },
      { status: 500 }
    );
  }
}
