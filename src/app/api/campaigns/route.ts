import { NextResponse } from "next/server";
import { CaseService } from "@/modules/cases/services/case.service";
import { AppError } from "@/lib/errors/app-error";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  try {
    const campaigns = await CaseService.getPublishedCampaigns();

    return NextResponse.json({
      ok: true,
      data: campaigns,
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

    logger.error("Unexpected error retrieving published campaigns", {
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      {
        error: "Failed to retrieve campaign archive",
        code: "INTERNAL_SERVER_ERROR",
      },
      { status: 500 }
    );
  }
}
