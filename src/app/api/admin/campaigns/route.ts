import { NextRequest, NextResponse } from "next/server";
import { AdminGuard } from "@/modules/administration/guards/admin.guard";
import { AdminContentService } from "@/modules/administration/services/admin-content.service";
import { CreateCampaignSchema } from "@/modules/administration/validation/admin.schema";
import { AppError } from "@/lib/errors/app-error";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/campaigns
 */
export async function GET(): Promise<NextResponse> {
  try {
    await AdminGuard.requirePermission("CAMPAIGN_VIEW");
    const campaigns = await AdminContentService.listCampaigns();

    return NextResponse.json({
      ok: true,
      data: { campaigns },
    });
  } catch (err: any) {
    if (err instanceof AppError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.statusCode });
    }

    logger.error("Failed to list campaigns", { error: err.message });
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_SERVER_ERROR" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/campaigns
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const admin = await AdminGuard.requirePermission("CAMPAIGN_CREATE");
    const body = await request.json().catch(() => ({}));
    const validated = CreateCampaignSchema.parse(body);

    const campaign = await AdminContentService.createCampaign(admin.userId, validated);

    return NextResponse.json({
      ok: true,
      data: { campaign },
    });
  } catch (err: any) {
    if (err instanceof AppError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.statusCode });
    }

    logger.error("Failed to create campaign", { error: err.message });
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_SERVER_ERROR" },
      { status: 500 }
    );
  }
}
