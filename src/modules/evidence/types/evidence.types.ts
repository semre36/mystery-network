import { ClueType, AssignmentStatus, AssetType } from "@prisma/client";

export type EvidenceAccessType = "ASSIGNED" | "SHARED" | "INVESTIGATION_WIDE";

export interface SafeEvidenceAssetDto {
  id: string;
  assetType: AssetType;
  fileName: string;
  mimeType: string;
  fileSizeBytes: number;
  downloadUrl?: string;
  metadata?: Record<string, unknown>;
}

export interface SafeEvidenceNoteDto {
  id: string;
  content: string;
  updatedAt: string;
}

export interface SafeEvidenceShareInfoDto {
  id: string;
  sharedAt: string;
  sharingPlayerCodename: string;
  recipientPlayerCodename?: string;
  isMine: boolean;
}

export interface SafeEvidenceSummaryDto {
  id: string;
  clueCode: string;
  title: string;
  description: string;
  clueType: ClueType;
  classification: string;
  isShareable: boolean;
  chapterId: string | null;
  chapterTitle: string | null;
  chapterOrder: number | null;
  accessType: EvidenceAccessType;
  assignmentStatus: AssignmentStatus | null;
  discoveredAt: string;
  hasNote: boolean;
  assetsCount: number;
}

export interface SafeEvidenceDetailDto extends SafeEvidenceSummaryDto {
  content: Record<string, unknown>;
  assets: SafeEvidenceAssetDto[];
  myNote: SafeEvidenceNoteDto | null;
  shares: SafeEvidenceShareInfoDto[];
  eligibleRecipients: Array<{
    id: string;
    codename: string;
    displayName: string;
  }>;
}

export interface EvidenceQueryFilters {
  type?: ClueType;
  chapterId?: string;
  search?: string;
  scope?: "ALL" | "MINE" | "SHARED" | "INVESTIGATION_WIDE";
  page?: number;
  limit?: number;
}
