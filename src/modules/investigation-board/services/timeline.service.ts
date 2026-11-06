import { prisma } from "@/server/infrastructure/database";
import { AppError } from "@/lib/errors/app-error";
import { BoardGuard } from "../guards/board.guard";
import {
  CreateTimelineEventInput,
  UpdateTimelineEventInput,
  SafeTimelineEventDto,
  TimePrecision,
} from "../types/board.types";
import { logger } from "@/lib/logger";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export class TimelineService {
  /**
   * Retrieves all chronological timeline events for the investigation, ordered by event timestamp.
   */
  public static async getTimelineEvents(
    userId: string,
    investigationId: string
  ): Promise<SafeTimelineEventDto[]> {
    const { investigation } = await BoardGuard.verifyBoardAccess(userId, investigationId, {
      allowReadOnlyIfConcluded: true,
    });

    const events = await prisma.investigationTimelineEvent.findMany({
      where: { investigationId: investigation.id },
      include: {
        createdBy: {
          select: { codename: true },
        },
      },
      orderBy: [{ eventTime: "asc" }, { createdAt: "asc" }],
    });

    return events.map((e) => ({
      id: e.id,
      investigationId: e.investigationId,
      title: e.title,
      description: e.description,
      eventTime: e.eventTime ? e.eventTime.toISOString() : null,
      timePrecision: e.timePrecision,
      rawTimeLabel: e.rawTimeLabel,
      metadata: (e.metadata as Record<string, any>) ?? {},
      createdByPlayerId: e.createdByPlayerId,
      createdByCodename: e.createdBy.codename,
      createdAt: e.createdAt.toISOString(),
      updatedAt: e.updatedAt.toISOString(),
    }));
  }

  /**
   * Creates a chronological event on the investigation timeline with support for uncertain or approximate times.
   */
  public static async createTimelineEvent(
    userId: string,
    investigationId: string,
    input: CreateTimelineEventInput
  ): Promise<SafeTimelineEventDto> {
    const { investigation, playerId, playerProfile } = await BoardGuard.verifyBoardAccess(
      userId,
      investigationId
    );

    let parsedEventTime: Date | null = null;
    if (input.eventTime) {
      parsedEventTime = new Date(input.eventTime);
      if (isNaN(parsedEventTime.getTime())) {
        throw new AppError("Invalid event date/time format", 400, "INVALID_TIMESTAMP");
      }
    }

    const event = await prisma.investigationTimelineEvent.create({
      data: {
        investigationId: investigation.id,
        title: input.title,
        description: input.description,
        eventTime: parsedEventTime,
        timePrecision: input.timePrecision ?? TimePrecision.EXACT,
        rawTimeLabel: input.rawTimeLabel ?? null,
        metadata: input.metadata ?? {},
        createdByPlayerId: playerId,
      },
    });

    logger.info("Timeline event added to investigation", {
      eventId: event.id,
      investigationId: investigation.id,
      precision: event.timePrecision,
    });

    return {
      id: event.id,
      investigationId: event.investigationId,
      title: event.title,
      description: event.description,
      eventTime: event.eventTime ? event.eventTime.toISOString() : null,
      timePrecision: event.timePrecision,
      rawTimeLabel: event.rawTimeLabel,
      metadata: (event.metadata as Record<string, any>) ?? {},
      createdByPlayerId: event.createdByPlayerId,
      createdByCodename: playerProfile.codename,
      createdAt: event.createdAt.toISOString(),
      updatedAt: event.updatedAt.toISOString(),
    };
  }

  /**
   * Updates an existing timeline event.
   */
  public static async updateTimelineEvent(
    userId: string,
    investigationId: string,
    eventId: string,
    input: UpdateTimelineEventInput
  ): Promise<SafeTimelineEventDto> {
    const trimmedEventId = (eventId || "").trim();
    if (!UUID_REGEX.test(trimmedEventId)) {
      throw new AppError("Invalid event identifier", 400, "INVALID_EVENT_ID");
    }

    const { investigation, playerProfile } = await BoardGuard.verifyBoardAccess(
      userId,
      investigationId
    );

    const existing = await prisma.investigationTimelineEvent.findUnique({
      where: { id: trimmedEventId },
    });

    if (!existing || existing.investigationId !== investigation.id) {
      throw new AppError("Timeline event not found or restricted", 404, "EVENT_NOT_FOUND");
    }

    let parsedEventTime = undefined;
    if (input.eventTime !== undefined) {
      if (input.eventTime === null) {
        parsedEventTime = null;
      } else {
        const d = new Date(input.eventTime);
        if (isNaN(d.getTime())) {
          throw new AppError("Invalid event date/time format", 400, "INVALID_TIMESTAMP");
        }
        parsedEventTime = d;
      }
    }

    const updated = await prisma.investigationTimelineEvent.update({
      where: { id: trimmedEventId },
      data: {
        ...(typeof input.title === "string" ? { title: input.title } : {}),
        ...(typeof input.description === "string" ? { description: input.description } : {}),
        ...(parsedEventTime !== undefined ? { eventTime: parsedEventTime } : {}),
        ...(input.timePrecision ? { timePrecision: input.timePrecision } : {}),
        ...(input.rawTimeLabel !== undefined ? { rawTimeLabel: input.rawTimeLabel } : {}),
        ...(input.metadata !== undefined ? { metadata: input.metadata } : {}),
      },
    });

    return {
      id: updated.id,
      investigationId: updated.investigationId,
      title: updated.title,
      description: updated.description,
      eventTime: updated.eventTime ? updated.eventTime.toISOString() : null,
      timePrecision: updated.timePrecision,
      rawTimeLabel: updated.rawTimeLabel,
      metadata: (updated.metadata as Record<string, any>) ?? {},
      createdByPlayerId: updated.createdByPlayerId,
      createdByCodename: playerProfile.codename,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  }

  /**
   * Deletes a timeline event.
   */
  public static async deleteTimelineEvent(
    userId: string,
    investigationId: string,
    eventId: string
  ): Promise<void> {
    const trimmedEventId = (eventId || "").trim();
    if (!UUID_REGEX.test(trimmedEventId)) {
      throw new AppError("Invalid event identifier", 400, "INVALID_EVENT_ID");
    }

    const { investigation } = await BoardGuard.verifyBoardAccess(userId, investigationId);

    const existing = await prisma.investigationTimelineEvent.findUnique({
      where: { id: trimmedEventId },
    });

    if (!existing || existing.investigationId !== investigation.id) {
      throw new AppError("Timeline event not found or restricted", 404, "EVENT_NOT_FOUND");
    }

    await prisma.investigationTimelineEvent.delete({
      where: { id: trimmedEventId },
    });

    logger.info("Deleted timeline event", {
      eventId: trimmedEventId,
      investigationId: investigation.id,
    });
  }
}

