import { NextRequest, NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/modules/authentication/guards/auth.guard";
import { TimelineService } from "@/modules/investigation-board/services/timeline.service";
import { CreateTimelineEventSchema } from "@/modules/investigation-board/validation/board.schema";
import { AppError } from "@/lib/errors/app-error";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

/**
 * GET /api/investigations/[investigationId]/timeline
 * Retrieves chronological events for the investigation.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ investigationId: string }> }
): Promise<NextResponse> {
  try {
    const user = await requireAuthenticatedUser();
    const { investigationId } = await context.params;

    const events = await TimelineService.getTimelineEvents(user.id, investigationId);

    return NextResponse.json({
      ok: true,
      data: {
        events,
        total: events.length,
      },
    });
  } catch (err: any) {
    if (err instanceof AppError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.statusCode });
    }

    logger.error("Failed to retrieve timeline events", { error: err.message });
    return NextResponse.json(
      { error: "Failed to retrieve timeline events", code: "INTERNAL_SERVER_ERROR" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/investigations/[investigationId]/timeline
 * Creates a new chronological event on the investigation timeline.
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ investigationId: string }> }
): Promise<NextResponse> {
  try {
    const user = await requireAuthenticatedUser();
    const { investigationId } = await context.params;

    const body = await request.json().catch(() => ({}));
    const validated = CreateTimelineEventSchema.parse(body);

    const event = await TimelineService.createTimelineEvent(
      user.id,
      investigationId,
      validated as any
    );

    return NextResponse.json(
      {
        ok: true,
        data: { event },
      },
      { status: 201 }
    );
  } catch (err: any) {
    if (err?.name === "ZodError") {
      return NextResponse.json(
        { error: "Invalid timeline event payload", details: err.errors, code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    if (err instanceof AppError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.statusCode });
    }

    logger.error("Failed to create timeline event", { error: err.message });
    return NextResponse.json(
      { error: "Failed to create timeline event", code: "INTERNAL_SERVER_ERROR" },
      { status: 500 }
    );
  }
}

