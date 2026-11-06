import { NextRequest, NextResponse } from "next/server";
import { CaseService } from "@/modules/cases/services/case.service";
import { AppError } from "@/lib/errors/app-error";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ slug: string }> }
): Promise<NextResponse> {
  try {
    const { slug } = await context.params;

    if (!slug) {
      return NextResponse.json(
        {
          error: "Campaign slug is required",
          code: "MISSING_CAMPAIGN_SLUG",
        },
        { status: 400 }
      );
    }

    const campaign = await CaseService.getCampaignBySlug(slug);

    return NextResponse.json({
      ok: true,
      data: campaign,
    });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json(
        {
          error: error.message,
          code: error.code,
          ...(error.details ? { details: error.details } : {}),
        },
        { status: error.statusCode }
      );
    }

    logger.error("Unexpected error retrieving campaign detail", {
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      {
        error: "Failed to retrieve campaign details",
        code: "INTERNAL_SERVER_ERROR",
      },
      { status: 500 }
    );
  }
}
