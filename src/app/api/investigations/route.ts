import { NextRequest, NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/modules/authentication/guards/auth.guard";
import { InvestigationService } from "@/modules/investigations/services/investigation.service";
import {
  StartInvestigationSchema,
  InvestigationQuerySchema,
} from "@/modules/investigations/validation/investigation.schema";
import { AppError } from "@/lib/errors/app-error";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

/**
 * POST /api/investigations
 * Starts a new investigation or resumes an active one for a published case.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const user = await requireAuthenticatedUser();

    let bodyJson: unknown;
    try {
      bodyJson = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Malformed JSON payload", code: "INVALID_JSON" },
        { status: 400 }
      );
    }

    const parsed = StartInvestigationSchema.safeParse(bodyJson);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid start investigation payload",
          code: "VALIDATION_ERROR",
          details: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    const result = await InvestigationService.startInvestigation(
      user.id,
      parsed.data.caseIdentifier,
      {
        teamId: parsed.data.teamId,
        participantPlayerIds: parsed.data.participantPlayerIds,
      }
    );

    return NextResponse.json(
      {
        ok: true,
        data: result,
      },
      { status: result.wasResumed ? 200 : 201 }
    );
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

    logger.error("Unexpected error starting investigation", {
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      {
        error: "Failed to dispatch investigation session",
        code: "INTERNAL_SERVER_ERROR",
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/investigations
 * Retrieves the authenticated player's personal investigation sessions history.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const user = await requireAuthenticatedUser();

    const { searchParams } = request.nextUrl;
    const rawQuery: Record<string, string> = {};
    searchParams.forEach((val, key) => {
      rawQuery[key] = val;
    });

    const parsed = InvestigationQuerySchema.safeParse(rawQuery);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid investigation query parameters",
          code: "INVALID_QUERY_PARAMS",
          details: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    const result = await InvestigationService.getPlayerInvestigations(user.id, parsed.data);

    return NextResponse.json({
      ok: true,
      data: result,
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

    logger.error("Unexpected error querying player investigations", {
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      {
        error: "Failed to retrieve investigation history",
        code: "INTERNAL_SERVER_ERROR",
      },
      { status: 500 }
    );
  }
}
