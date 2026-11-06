import {
  PuzzleType,
  CaseDifficulty,
  ContentStatus,
  AttemptStatus,
  PuzzleProgressStatus,
} from "@prisma/client";

export interface NormalizationOptions {
  caseSensitive?: boolean;
  stripWhitespace?: boolean;
  stripPunctuation?: boolean;
  collapseWhitespace?: boolean;
}

export interface ValidationOutcome {
  isCorrect: boolean;
  resultStatus: AttemptStatus;
  feedback?: string;
}

export interface PuzzleValidatorInput {
  submittedAnswer: string;
  publicConfig: any;
  secretConfig: any;
  solutionHash?: string | null;
}

export interface SafePuzzleStageDto {
  id: string;
  puzzleId: string;
  stageOrder: number;
  title: string;
  instructions: string | null;
  puzzleType: PuzzleType;
  publicConfiguration: any;
  maxAttempts: number | null;
  isCompleted: boolean;
  isCurrent: boolean;
  isLocked: boolean;
}

export interface SafePuzzleHintDto {
  id: string;
  puzzleId: string;
  stageId: string | null;
  hintOrder: number;
  title: string | null;
  content: string | null; // null if locked
  isUnlocked: boolean;
  unlockConditions: any | null;
}

export interface SafePuzzleSummaryDto {
  id: string;
  caseId: string;
  chapterId: string | null;
  chapterTitle: string | null;
  chapterOrder: number | null;
  title: string;
  description: string;
  puzzleType: PuzzleType;
  difficulty: CaseDifficulty;
  status: ContentStatus;
  order: number;
  isMultiStage: boolean;
  stageCount: number;
  maxAttempts: number | null;
  progressStatus: PuzzleProgressStatus;
  currentStageOrder: number;
  completedAt: string | null;
  solvedByCodename: string | null;
  totalAttemptsCount: number;
  myAttemptsCount: number;
  isLocked: boolean;
}

export interface SafePuzzleDetailDto extends SafePuzzleSummaryDto {
  instructions: string | null;
  publicConfiguration: any;
  currentStage: SafePuzzleStageDto | null;
  stages: SafePuzzleStageDto[];
  hints: SafePuzzleHintDto[];
  remainingAttempts: number | null; // null = unlimited
  myRemainingAttempts: number | null;
}

export interface SafePuzzleAttemptDto {
  id: string;
  puzzleId: string;
  stageId: string | null;
  stageOrder: number | null;
  submittedAnswer: string;
  resultStatus: AttemptStatus;
  isCorrect: boolean;
  attemptedAt: string;
  playerCodename: string;
  isMine: boolean;
}

export interface SafePuzzleAttemptResultDto {
  isCorrect: boolean;
  resultStatus: AttemptStatus;
  feedback: string;
  attemptsUsed: number;
  remainingAttempts: number | null;
  isStageCompleted: boolean;
  isPuzzleCompleted: boolean;
  nextStageOrder: number | null;
  currentStageOrder: number;
  completedAt: string | null;
  unlockedHintIds?: string[];
}
