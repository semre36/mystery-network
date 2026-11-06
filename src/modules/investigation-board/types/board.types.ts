import {
  BoardNodeType,
  BoardRelationshipType,
  TimePrecision,
  TheoryStatus,
  TheoryEvidenceRelationship,
} from "@prisma/client";

export {
  BoardNodeType,
  BoardRelationshipType,
  TimePrecision,
  TheoryStatus,
  TheoryEvidenceRelationship,
};

// ------------------------------------------------------------------------------
// DTOs & Safe Representations
// ------------------------------------------------------------------------------

export interface SafeBoardViewportDto {
  zoom: number;
  panX: number;
  panY: number;
}

export interface BoardNodeEntityPreview {
  id: string;
  type: "CLUE" | "CHARACTER";
  code?: string | null;
  title: string;
  snippet?: string;
  clueType?: string;
  role?: string | null;
}

export interface SafeBoardNodeDto {
  id: string;
  boardId: string;
  nodeType: BoardNodeType;
  referencedEntityId: string | null;
  title: string;
  description: string | null;
  positionX: number;
  positionY: number;
  width: number;
  height: number | null;
  color: string | null;
  metadata: Record<string, any>;
  createdByPlayerId: string;
  createdByCodename: string;
  createdAt: string;
  updatedAt: string;
  entityPreview?: BoardNodeEntityPreview | null;
}

export interface SafeBoardConnectionDto {
  id: string;
  boardId: string;
  sourceNodeId: string;
  targetNodeId: string;
  relationshipType: BoardRelationshipType;
  label: string | null;
  description: string | null;
  createdByPlayerId: string;
  createdByCodename: string;
  createdAt: string;
  updatedAt: string;
}

export interface SafeInvestigationBoardDto {
  id: string;
  investigationId: string;
  title: string;
  description: string | null;
  viewport: SafeBoardViewportDto;
  nodes: SafeBoardNodeDto[];
  connections: SafeBoardConnectionDto[];
  createdAt: string;
  updatedAt: string;
}

export interface SafeTimelineEventDto {
  id: string;
  investigationId: string;
  title: string;
  description: string;
  eventTime: string | null;
  timePrecision: TimePrecision;
  rawTimeLabel: string | null;
  metadata: Record<string, any>;
  createdByPlayerId: string;
  createdByCodename: string;
  createdAt: string;
  updatedAt: string;
}

export interface SafeTheoryEvidenceDto {
  id: string;
  theoryId: string;
  clueId: string;
  clueTitle: string;
  clueCode: string | null;
  clueType: string;
  relationship: TheoryEvidenceRelationship;
  explanation: string | null;
  createdByPlayerId: string;
  createdByCodename: string;
  createdAt: string;
  updatedAt: string;
}

export interface SafeInvestigationTheoryDto {
  id: string;
  investigationId: string;
  title: string;
  description: string;
  status: TheoryStatus;
  createdByPlayerId: string;
  createdByCodename: string;
  evidenceSummary: {
    supports: number;
    contradicts: number;
    neutral: number;
    total: number;
  };
  evidence?: SafeTheoryEvidenceDto[];
  createdAt: string;
  updatedAt: string;
}

// ------------------------------------------------------------------------------
// Input Interfaces
// ------------------------------------------------------------------------------

export interface CreateBoardNodeInput {
  nodeType: BoardNodeType;
  referencedEntityId?: string;
  title: string;
  description?: string;
  positionX: number;
  positionY: number;
  width?: number;
  height?: number;
  color?: string;
  metadata?: Record<string, any>;
}

export interface UpdateBoardNodeInput {
  title?: string;
  description?: string;
  positionX?: number;
  positionY?: number;
  width?: number;
  height?: number;
  color?: string;
  metadata?: Record<string, any>;
}

export interface CreateBoardConnectionInput {
  sourceNodeId: string;
  targetNodeId: string;
  relationshipType?: BoardRelationshipType;
  label?: string;
  description?: string;
}

export interface UpdateBoardConnectionInput {
  relationshipType?: BoardRelationshipType;
  label?: string;
  description?: string;
}

export interface CreateTimelineEventInput {
  title: string;
  description: string;
  eventTime?: string;
  timePrecision?: TimePrecision;
  rawTimeLabel?: string;
  metadata?: Record<string, any>;
}

export interface UpdateTimelineEventInput {
  title?: string;
  description?: string;
  eventTime?: string | null;
  timePrecision?: TimePrecision;
  rawTimeLabel?: string | null;
  metadata?: Record<string, any>;
}

export interface CreateTheoryInput {
  title: string;
  description: string;
  status?: TheoryStatus;
}

export interface UpdateTheoryInput {
  title?: string;
  description?: string;
  status?: TheoryStatus;
}

export interface AddTheoryEvidenceInput {
  clueId: string;
  relationship?: TheoryEvidenceRelationship;
  explanation?: string;
}
