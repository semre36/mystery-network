import type {
  SubmissionStatus,
  EvaluationResult,
  CaseDifficulty,
} from "@prisma/client";

export { SubmissionStatus, EvaluationResult };

/**
 * Structured content of a player's case theory / indictment.
 */
export interface CaseSubmissionAnswerData {
  title: string;
  primaryCharacterId: string;
  additionalCharacterIds?: string[];
  motive: string;
  method: string;
  timelineSummary: string;
  explanation: string;
  supportingEvidenceIds: string[];
  contradictingEvidenceIds: string[];
  additionalFindings?: string;
}

/**
 * Safe public DTO for a CaseSubmission.
 */
export interface SafeCaseSubmissionDto {
  id: string;
  investigationId: string;
  submittedById: string;
  submittedByCodename?: string;
  title: string | null;
  status: SubmissionStatus;
  answerData: CaseSubmissionAnswerData;
  submittedAt: string | null;
  createdAt: string;
  updatedAt: string;
  evaluation?: SafeSubmissionEvaluationDto | null;
}

/**
 * Score breakdown per deductive dimension.
 */
export interface EvaluationDimensionBreakdown {
  score: number;
  maxScore: number;
  passed: boolean;
  notes: string;
}

export interface EvaluationDimensions {
  primarySuspect: EvaluationDimensionBreakdown;
  motive: EvaluationDimensionBreakdown;
  method: EvaluationDimensionBreakdown;
  timeline: EvaluationDimensionBreakdown;
  supportingEvidence: EvaluationDimensionBreakdown;
  contradictingEvidence: EvaluationDimensionBreakdown;
}

/**
 * Constructive feedback returned to operative upon evaluation.
 */
export interface EvaluationFeedbackDto {
  summary: string;
  dimensions: EvaluationDimensions;
  correctConclusions: string[];
  missedReasoningAreas: string[];
  evidenceFeedback: {
    usefulReferences: string[];
    missedEvidence: string[];
    unsupportedCitations: string[];
  };
  recommendations: string[];
  xpAwarded: number;
  achievementsUnlocked: string[];
}

/**
 * Safe DTO for a completed submission evaluation.
 */
export interface SafeSubmissionEvaluationDto {
  id: string;
  submissionId: string;
  result: EvaluationResult;
  score: number;
  feedback: EvaluationFeedbackDto;
  evaluatedAt: string;
}

/**
 * Complete investigation results response DTO.
 */
export interface SafeInvestigationResultDto {
  investigationId: string;
  caseId: string;
  caseTitle: string;
  caseCode: string;
  difficulty: CaseDifficulty;
  status: string;
  completedAt: string | null;
  submission: SafeCaseSubmissionDto;
  evaluation: SafeSubmissionEvaluationDto;
  nextChapterAvailable: boolean;
  nextChapterId?: string | null;
  nextCase?: { id: string; title: string; caseCode: string } | null;
}

/**
 * Server-only secret configuration on a Case for evaluating submissions.
 */
export interface CaseSolutionConfig {
  primaryCharacterId: string;
  primaryCharacterName?: string;
  motiveKeywords: string[];
  methodKeywords: string[];
  timelineKeywords: string[];
  requiredSupportingClueCodes: string[];
  requiredContradictingClueCodes: string[];
  scoringCriteria: {
    primarySuspectWeight: number; // default: 30
    motiveWeight: number;         // default: 15
    methodWeight: number;         // default: 15
    timelineWeight: number;       // default: 15
    supportingEvidenceWeight: number; // default: 15
    contradictingEvidenceWeight: number; // default: 10
    maxScore: number;             // default: 100
    passScore: number;            // default: 60
    perfectScore: number;         // default: 90
  };
  rewards: {
    baseXP: number;               // default: 250
    perfectBonusXP: number;       // default: 150
    firstSolveBonusXP?: number;   // default: 100
  };
}
