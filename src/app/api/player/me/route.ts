import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/modules/authentication/guards/auth.guard";
import { PlayerService } from "@/modules/players/services/player.service";
import { AppError } from "@/lib/errors/app-error";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  try {
    const user = await requireAuthenticatedUser();
    const dashboardData = await PlayerService.getDashboardData(user.id);

    return NextResponse.json({
      ok: true,
      data: dashboardData,
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

    logger.error("Unexpected failure retrieving player dashboard data", {
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      {
        error: "Unable to retrieve investigator dashboard",
        code: "INTERNAL_SERVER_ERROR",
      },
      { status: 500 }
    );
  }
}
