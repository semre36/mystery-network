import type {
  CaseDifficulty,
  InvestigationStatus,
  ParticipantStatus,
  PlayMode,
  ChapterProgressStatus,
} from "@prisma/client";
import type { SafeCaseSummaryDto, SafeCharacterDto } from "@/modules/cases/types/case.types";

export interface SafeInvestigationSummaryDto {
  id: string;
  caseId: string;
  caseCode: string;
  caseTitle: string;
  difficulty: CaseDifficulty;
  estimatedDurationMinutes: number;
  status: InvestigationStatus;
  playMode: PlayMode;
  startedAt: string;
  completedAt: string | null;
  lastActiveAt: string;
  currentChapterOrder: number;
  totalChapters: number;
  completedChaptersCount: number;
  participantCount: number;
}

export interface SafeInvestigationChapterProgressDto {
  chapterId: string;
  chapterOrder: number;
  title: string;
  description: string;
  status: ChapterProgressStatus;
  unlockedAt: string | null;
  completedAt: string | null;
}

export interface SafeInvestigationWorkspaceDto {
  id: string;
  status: InvestigationStatus;
  playMode: PlayMode;
  startedAt: string;
  completedAt: string | null;
  updatedAt: string;
  case: SafeCaseSummaryDto;
  characters: SafeCharacterDto[];
  chapters: SafeInvestigationChapterProgressDto[];
  currentChapter: SafeInvestigationChapterProgressDto | null;
  completedChaptersCount: number;
  totalChapters: number;
  myParticipantStatus: ParticipantStatus;
}

export interface InvestigationQueryFilters {
  status?: InvestigationStatus;
  page?: number;
  limit?: number;
}
