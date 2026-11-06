import { NextRequest, NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/modules/authentication/guards/auth.guard";
import { TimelineService } from "@/modules/investigation-board/services/timeline.service";
import { UpdateTimelineEventSchema } from "@/modules/investigation-board/validation/board.schema";
import { AppError } from "@/lib/errors/app-error";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/investigations/[investigationId]/timeline/[eventId]
 * Modifies an existing timeline event.
 */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ investigationId: string; eventId: string }> }
): Promise<NextResponse> {
  try {
    const user = await requireAuthenticatedUser();
    const { investigationId, eventId } = await context.params;

    const body = await request.json().catch(() => ({}));
    const validated = UpdateTimelineEventSchema.parse(body);

    const event = await TimelineService.updateTimelineEvent(
      user.id,
      investigationId,
      eventId,
      validated as any
    );

    return NextResponse.json({
      ok: true,
      data: { event },
    });
  } catch (err: any) {
    if (err?.name === "ZodError") {
      return NextResponse.json(
        { error: "Invalid timeline update payload", details: err.errors, code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    if (err instanceof AppError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.statusCode });
    }

    logger.error("Failed to update timeline event", { error: err.message });
    return NextResponse.json(
      { error: "Failed to update timeline event", code: "INTERNAL_SERVER_ERROR" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/investigations/[investigationId]/timeline/[eventId]
 * Deletes an event from the investigation timeline.
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ investigationId: string; eventId: string }> }
): Promise<NextResponse> {
  try {
    const user = await requireAuthenticatedUser();
    const { investigationId, eventId } = await context.params;

    await TimelineService.deleteTimelineEvent(user.id, investigationId, eventId);

    return NextResponse.json({
      ok: true,
      data: { message: "Timeline event deleted successfully" },
    });
  } catch (err: any) {
    if (err instanceof AppError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.statusCode });
    }

    logger.error("Failed to delete timeline event", { error: err.message });
    return NextResponse.json(
      { error: "Failed to delete timeline event", code: "INTERNAL_SERVER_ERROR" },
      { status: 500 }
    );
  }
}

