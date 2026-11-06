import { z } from "zod";
import {
  BoardNodeType,
  BoardRelationshipType,
  TimePrecision,
  TheoryStatus,
  TheoryEvidenceRelationship,
} from "@prisma/client";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const BoardNodeTypeEnum = z.nativeEnum(BoardNodeType);
export const BoardRelationshipTypeEnum = z.nativeEnum(BoardRelationshipType);
export const TimePrecisionEnum = z.nativeEnum(TimePrecision);
export const TheoryStatusEnum = z.nativeEnum(TheoryStatus);
export const TheoryEvidenceRelationshipEnum = z.nativeEnum(TheoryEvidenceRelationship);

export const CreateBoardNodeSchema = z.object({
  nodeType: BoardNodeTypeEnum,
  referencedEntityId: z.string().regex(UUID_REGEX, "Invalid entity UUID").optional(),
  title: z.string().trim().min(1, "Title is required").max(120, "Title cannot exceed 120 chars"),
  description: z.string().trim().max(2000, "Description cannot exceed 2000 chars").optional(),
  positionX: z.number().min(-50000).max(50000),
  positionY: z.number().min(-50000).max(50000),
  width: z.number().min(80).max(1000).optional().default(240),
  height: z.number().min(60).max(2000).optional(),
  color: z.string().trim().max(30).optional(),
  metadata: z.record(z.string(), z.any()).optional().default({}),
});

export const UpdateBoardNodeSchema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
  description: z.string().trim().max(2000).optional(),
  positionX: z.number().min(-50000).max(50000).optional(),
  positionY: z.number().min(-50000).max(50000).optional(),
  width: z.number().min(80).max(1000).optional(),
  height: z.number().min(60).max(2000).optional(),
  color: z.string().trim().max(30).optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

export const UpdateBoardViewportSchema = z.object({
  zoom: z.number().min(0.1).max(5.0),
  panX: z.number().min(-100000).max(100000),
  panY: z.number().min(-100000).max(100000),
});

export const CreateBoardConnectionSchema = z.object({
  sourceNodeId: z.string().regex(UUID_REGEX, "Invalid source node UUID"),
  targetNodeId: z.string().regex(UUID_REGEX, "Invalid target node UUID"),
  relationshipType: BoardRelationshipTypeEnum.optional().default(BoardRelationshipType.RELATED_TO),
  label: z.string().trim().max(60).optional(),
  description: z.string().trim().max(1000).optional(),
});

export const UpdateBoardConnectionSchema = z.object({
  relationshipType: BoardRelationshipTypeEnum.optional(),
  label: z.string().trim().max(60).optional(),
  description: z.string().trim().max(1000).optional(),
});

export const CreateTimelineEventSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(120),
  description: z.string().trim().min(1, "Description is required").max(3000),
  eventTime: z.string().datetime({ offset: true }).optional(),
  timePrecision: TimePrecisionEnum.optional().default(TimePrecision.EXACT),
  rawTimeLabel: z.string().trim().max(80).optional(),
  metadata: z.record(z.string(), z.any()).optional().default({}),
});

export const UpdateTimelineEventSchema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
  description: z.string().trim().min(1).max(3000).optional(),
  eventTime: z.string().datetime({ offset: true }).nullable().optional(),
  timePrecision: TimePrecisionEnum.optional(),
  rawTimeLabel: z.string().trim().max(80).nullable().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

export const CreateTheorySchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(120),
  description: z.string().trim().min(1, "Description is required").max(5000),
  status: TheoryStatusEnum.optional().default(TheoryStatus.ACTIVE),
});

export const UpdateTheorySchema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
  description: z.string().trim().min(1).max(5000).optional(),
  status: TheoryStatusEnum.optional(),
});

export const AddTheoryEvidenceSchema = z.object({
  clueId: z.string().regex(UUID_REGEX, "Invalid clue UUID"),
  relationship: TheoryEvidenceRelationshipEnum.optional().default(
    TheoryEvidenceRelationship.SUPPORTS
  ),
  explanation: z.string().trim().max(1000).optional(),
});
