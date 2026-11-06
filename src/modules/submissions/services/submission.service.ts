import { prisma } from "@/server/infrastructure/database";
import { AppError } from "@/lib/errors/app-error";
import { logger } from "@/lib/logger";
import { SubmissionStatus, InvestigationStatus, PlayMode } from "@prisma/client";
import { SubmissionGuard } from "../guards/submission.guard";
import { EvaluationService } from "./evaluation.service";
import type {
  SafeCaseSubmissionDto,
  SafeInvestigationResultDto,
  CaseSubmissionAnswerData,
} from "../types/submission.types";
import type {
  SaveSubmissionDraftInput,
  FinalSubmissionInput,
} from "../validation/submission.schema";

export class SubmissionService {
  /**
   * Retrieves the current submission (draft or evaluated) for an active investigation.
   */
  public static async getSubmission(
    investigationId: string,
    userId: string
  ): Promise<SafeCaseSubmissionDto | null> {
    const { investigation } = await SubmissionGuard.verifySubmissionAccess(investigationId, userId);

    const submission = await prisma.caseSubmission.findFirst({
      where: { investigationId: investigation.id },
      include: {
        evaluation: true,
        submittedBy: { select: { codename: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!submission) return null;

    return this.formatSubmissionDto(submission);
  }

  /**
   * Saves or updates a draft case theory / indictment.
   */
  public static async saveDraft(
    investigationId: string,
    userId: string,
    input: SaveSubmissionDraftInput
  ): Promise<SafeCaseSubmissionDto> {
    const { investigation, playerId } = await SubmissionGuard.verifySubmissionAccess(
      investigationId,
      userId
    );

    // Reject modifications to terminal investigations
    if (
      investigation.status === InvestigationStatus.SOLVED ||
      investigation.status === InvestigationStatus.FAILED ||
      investigation.status === InvestigationStatus.ABANDONED
    ) {
      throw new AppError(
        `Cannot modify submission: investigation is already concluded (${investigation.status})`,
        400,
        "INVESTIGATION_TERMINAL"
      );
    }

    // Validate references
    if (
      input.primaryCharacterId ||
      (input.additionalCharacterIds && input.additionalCharacterIds.length > 0)
    ) {
      await SubmissionGuard.validateCharacterReferences(
        investigation.caseId,
        input.primaryCharacterId,
        input.additionalCharacterIds
      );
    }

    if (
      (input.supportingEvidenceIds && input.supportingEvidenceIds.length > 0) ||
      (input.contradictingEvidenceIds && input.contradictingEvidenceIds.length > 0)
    ) {
      await SubmissionGuard.validateEvidenceReferences(
        investigation.id,
        investigation.caseId,
        playerId,
        investigation.playMode,
        input.supportingEvidenceIds,
        input.contradictingEvidenceIds
      );
    }

    // Check for existing submission record
    const existing = await prisma.caseSubmission.findFirst({
      where: { investigationId: investigation.id },
      orderBy: { createdAt: "desc" },
    });

    if (existing && existing.status !== SubmissionStatus.DRAFT) {
      throw new AppError(
        "A formal indictment has already been submitted for this investigation. Indictments are immutable.",
        400,
        "SUBMISSION_IMMUTABLE"
      );
    }

    const answerData: CaseSubmissionAnswerData = {
      title: input.title || "Investigative Indictment",
      primaryCharacterId: input.primaryCharacterId || "",
      additionalCharacterIds: input.additionalCharacterIds || [],
      motive: input.motive || "",
      method: input.method || "",
      timelineSummary: input.timelineSummary || "",
      explanation: input.explanation || "",
      supportingEvidenceIds: input.supportingEvidenceIds || [],
      contradictingEvidenceIds: input.contradictingEvidenceIds || [],
      additionalFindings: input.additionalFindings || "",
    };

    let savedRecord;
    if (existing) {
      savedRecord = await prisma.caseSubmission.update({
        where: { id: existing.id },
        data: {
          title: input.title || existing.title,
          answerData: answerData as any,
          submittedById: playerId,
          updatedAt: new Date(),
        },
        include: {
          evaluation: true,
          submittedBy: { select: { codename: true } },
        },
      });
    } else {
      savedRecord = await prisma.caseSubmission.create({
        data: {
          investigationId: investigation.id,
          submittedById: playerId,
          title: input.title || "Investigative Indictment",
          status: SubmissionStatus.DRAFT,
          answerData: answerData as any,
        },
        include: {
          evaluation: true,
          submittedBy: { select: { codename: true } },
        },
      });
    }

    logger.info("Submission draft saved", {
      investigationId: investigation.id,
      submissionId: savedRecord.id,
      playerId,
    });

    return this.formatSubmissionDto(savedRecord);
  }

  /**
   * Formally submits the final case theory and immediately triggers deterministic evaluation.
   */
  public static async submitFinalIndictment(
    investigationId: string,
    userId: string,
    input: FinalSubmissionInput
  ) {
    const { investigation, playerId, memberRole } = await SubmissionGuard.verifySubmissionAccess(
      investigationId,
      userId
    );

    // 1. Verify submit permission (e.g. Lead Investigator in squad)
    SubmissionGuard.verifySubmitPermission(investigation.playMode, memberRole);

    // 2. Reject terminal or paused investigations
    if (
      investigation.status === InvestigationStatus.SOLVED ||
      investigation.status === InvestigationStatus.FAILED ||
      investigation.status === InvestigationStatus.ABANDONED
    ) {
      throw new AppError(
        `Cannot submit indictment: investigation is already concluded (${investigation.status})`,
        400,
        "INVESTIGATION_TERMINAL"
      );
    }

    if (investigation.status === InvestigationStatus.PAUSED) {
      throw new AppError(
        "Cannot submit indictment while investigation is paused. Resume the investigation first.",
        400,
        "INVESTIGATION_PAUSED"
      );
    }

    // 3. Strict validation of characters and evidence references
    await SubmissionGuard.validateCharacterReferences(
      investigation.caseId,
      input.primaryCharacterId,
      input.additionalCharacterIds
    );

    await SubmissionGuard.validateEvidenceReferences(
      investigation.id,
      investigation.caseId,
      playerId,
      investigation.playMode,
      input.supportingEvidenceIds,
      input.contradictingEvidenceIds
    );

    // 4. Check for existing submission
    const existing = await prisma.caseSubmission.findFirst({
      where: { investigationId: investigation.id },
      orderBy: { createdAt: "desc" },
    });

    if (existing && existing.status !== SubmissionStatus.DRAFT) {
      throw new AppError(
        "A formal indictment has already been submitted for this investigation. Indictments are immutable.",
        400,
        "SUBMISSION_IMMUTABLE"
      );
    }

    const answerData: CaseSubmissionAnswerData = {
      title: input.title,
      primaryCharacterId: input.primaryCharacterId,
      additionalCharacterIds: input.additionalCharacterIds || [],
      motive: input.motive,
      method: input.method,
      timelineSummary: input.timelineSummary,
      explanation: input.explanation,
      supportingEvidenceIds: input.supportingEvidenceIds,
      contradictingEvidenceIds: input.contradictingEvidenceIds || [],
      additionalFindings: input.additionalFindings || "",
    };

    let targetSubmissionId: string;
    const now = new Date();

    if (existing) {
      const updated = await prisma.caseSubmission.update({
        where: { id: existing.id },
        data: {
          title: input.title,
          answerData: answerData as any,
          status: SubmissionStatus.SUBMITTED,
          submittedAt: now,
          submittedById: playerId,
        },
      });
      targetSubmissionId = updated.id;
    } else {
      const created = await prisma.caseSubmission.create({
        data: {
          investigationId: investigation.id,
          submittedById: playerId,
          title: input.title,
          status: SubmissionStatus.SUBMITTED,
          submittedAt: now,
          answerData: answerData as any,
        },
      });
      targetSubmissionId = created.id;
    }

    logger.info("Formal indictment submitted", {
      investigationId: investigation.id,
      submissionId: targetSubmissionId,
      playerId,
    });

    // 5. Trigger evaluation
    const evaluation = await EvaluationService.evaluateSubmission(targetSubmissionId, playerId);

    const finalizedSubmission = await prisma.caseSubmission.findUnique({
      where: { id: targetSubmissionId },
      include: {
        evaluation: true,
        submittedBy: { select: { codename: true } },
      },
    });

    return {
      submission: this.formatSubmissionDto(finalizedSubmission!),
      evaluation,
    };
  }

  /**
   * Retrieves complete investigation evaluation results.
   */
  public static async getInvestigationResults(
    investigationId: string,
    userId: string
  ): Promise<SafeInvestigationResultDto> {
    const { investigation } = await SubmissionGuard.verifySubmissionAccess(investigationId, userId);

    const submission = await prisma.caseSubmission.findFirst({
      where: { investigationId: investigation.id, status: SubmissionStatus.EVALUATED },
      include: {
        evaluation: true,
        submittedBy: { select: { codename: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!submission || !submission.evaluation) {
      throw new AppError(
        "Evaluation results have not yet been generated for this investigation",
        404,
        "RESULTS_NOT_FOUND"
      );
    }

    const formattedSubmission = this.formatSubmissionDto(submission);

    return {
      investigationId: investigation.id,
      caseId: investigation.case.id,
      caseTitle: investigation.case.title,
      caseCode: investigation.case.caseCode,
      difficulty: investigation.case.difficulty,
      status: investigation.status,
      completedAt: investigation.completedAt ? investigation.completedAt.toISOString() : null,
      submission: formattedSubmission,
      evaluation: formattedSubmission.evaluation!,
      nextChapterAvailable: investigation.status === InvestigationStatus.SOLVED,
      nextCase: null,
    };
  }

  /**
   * Format Prisma record to SafeCaseSubmissionDto.
   */
  private static formatSubmissionDto(record: any): SafeCaseSubmissionDto {
    return {
      id: record.id,
      investigationId: record.investigationId,
      submittedById: record.submittedById,
      submittedByCodename: record.submittedBy?.codename,
      title: record.title,
      status: record.status as SubmissionStatus,
      answerData: record.answerData as unknown as CaseSubmissionAnswerData,
      submittedAt: record.submittedAt ? record.submittedAt.toISOString() : null,
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
      evaluation: record.evaluation
        ? {
            id: record.evaluation.id,
            submissionId: record.evaluation.submissionId,
            result: record.evaluation.result,
            score: record.evaluation.score,
            feedback: record.evaluation.feedback,
            evaluatedAt: record.evaluation.evaluatedAt.toISOString(),
          }
        : null,
    };
  }
}
