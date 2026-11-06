import { NextRequest, NextResponse } from "next/server";
import { AdminGuard } from "@/modules/administration/guards/admin.guard";
import { AdminContentService } from "@/modules/administration/services/admin-content.service";
import { UpdateCampaignSchema } from "@/modules/administration/validation/admin.schema";
import { AppError } from "@/lib/errors/app-error";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/campaigns/[campaignId]
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ campaignId: string }> }
): Promise<NextResponse> {
  try {
    await AdminGuard.requirePermission("CAMPAIGN_VIEW");
    const { campaignId } = await context.params;

    const campaign = await AdminContentService.getCampaignDetail(campaignId);

    return NextResponse.json({
      ok: true,
      data: { campaign },
    });
  } catch (err: any) {
    if (err instanceof AppError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.statusCode });
    }

    logger.error("Failed to retrieve campaign detail", { error: err.message });
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_SERVER_ERROR" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/campaigns/[campaignId]
 */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ campaignId: string }> }
): Promise<NextResponse> {
  try {
    const admin = await AdminGuard.requireAnyPermission([
      "CAMPAIGN_UPDATE",
      "CAMPAIGN_PUBLISH",
      "CAMPAIGN_ARCHIVE",
    ]);
    const { campaignId } = await context.params;

    const body = await request.json().catch(() => ({}));
    const validated = UpdateCampaignSchema.parse(body);

    const campaign = await AdminContentService.updateCampaign(admin.userId, campaignId, validated);

    return NextResponse.json({
      ok: true,
      data: { campaign },
    });
  } catch (err: any) {
    if (err instanceof AppError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.statusCode });
    }

    logger.error("Failed to update campaign", { error: err.message });
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_SERVER_ERROR" },
      { status: 500 }
    );
  }
}
