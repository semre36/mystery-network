import type { CaseDifficulty, ContentStatus, PlayMode } from "@prisma/client";

export interface SafeCampaignRef {
  id: string;
  slug: string;
  title: string;
}

export interface SafeChapterDto {
  id: string;
  chapterOrder: number;
  title: string;
  description: string;
  status: ContentStatus;
  isLocked: boolean;
}

export interface SafeCharacterDto {
  id: string;
  name: string;
  description: string;
  role?: string;
  clearance?: string;
  location?: string;
}

export interface SafeCaseSummaryDto {
  id: string;
  caseCode: string;
  title: string;
  description: string;
  difficulty: CaseDifficulty;
  estimatedDurationMinutes: number;
  minPlayers: number;
  maxPlayers: number;
  supportedPlayModes: PlayMode[];
  status: ContentStatus;
  publishedAt: string | null;
  campaign: SafeCampaignRef | null;
  chapterCount: number;
  characterCount: number;
  isFeatured: boolean;
}

export interface SafeCaseDetailDto extends SafeCaseSummaryDto {
  chapters: SafeChapterDto[];
  characters: SafeCharacterDto[];
  campaignDetail: SafeCampaignSummaryDto | null;
}

export interface SafeCampaignSummaryDto {
  id: string;
  slug: string;
  title: string;
  description: string;
  coverImageUrl: string | null;
  status: ContentStatus;
  caseCount: number;
}

export interface SafeCampaignDetailDto {
  id: string;
  slug: string;
  title: string;
  description: string;
  coverImageUrl: string | null;
  status: ContentStatus;
  cases: SafeCaseSummaryDto[];
}

export type CaseSortField = "newest" | "oldest" | "title" | "difficulty";

export interface CaseQueryFilters {
  search?: string;
  difficulty?: CaseDifficulty;
  campaignSlug?: string;
  sortBy?: CaseSortField;
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasMore: boolean;
}
