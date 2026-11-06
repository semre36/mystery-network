import { prisma } from "@/server/infrastructure/database";
import { AppError } from "@/lib/errors/app-error";
import { logger } from "@/lib/logger";
import {
  SubmissionStatus,
  EvaluationResult,
  InvestigationStatus,
  ChapterProgressStatus,
  PlayMode,
} from "@prisma/client";
import { RewardService } from "@/modules/progression/services/reward.service";
import type {
  CaseSubmissionAnswerData,
  CaseSolutionConfig,
  EvaluationDimensions,
  EvaluationFeedbackDto,
  SafeSubmissionEvaluationDto,
} from "../types/submission.types";

export class EvaluationService {
  /**
   * Evaluates a submitted indictment against the case's secret solution configuration.
   * Completely deterministic, server-only, and transactional.
   */
  public static async evaluateSubmission(
    submissionId: string,
    evaluatorPlayerId: string
  ): Promise<SafeSubmissionEvaluationDto> {
    const submission = await prisma.caseSubmission.findUnique({
      where: { id: submissionId },
      include: {
        evaluation: true,
        investigation: {
          include: {
            case: {
              include: {
                clues: { select: { id: true, clueCode: true, title: true } },
                characters: { select: { id: true, name: true } },
                chapters: { orderBy: { chapterOrder: "asc" } },
              },
            },
            participants: {
              select: { playerId: true, status: true },
            },
            progress: {
              include: { chapter: true },
            },
          },
        },
      },
    });

    if (!submission) {
      throw new AppError("Submission not found", 404, "SUBMISSION_NOT_FOUND");
    }

    // 1. Idempotency Check: If already evaluated, return the existing evaluation
    if (submission.evaluation && submission.status === SubmissionStatus.EVALUATED) {
      return this.formatEvaluationDto(submission.evaluation);
    }

    const { investigation } = submission;
    const { case: caseData } = investigation;

    // 2. Secret Solution Configuration Check
    if (!caseData.solutionConfig) {
      logger.error("Missing case evaluation configuration", {
        caseId: caseData.id,
        caseCode: caseData.caseCode,
      });
      throw new AppError(
        "Case evaluation configuration is not established on the server",
        422,
        "MISSING_EVALUATION_CONFIG"
      );
    }

    const solutionConfig = caseData.solutionConfig as unknown as CaseSolutionConfig;
    const answerData = submission.answerData as unknown as CaseSubmissionAnswerData;

    // 3. Score the 6 Deductive Dimensions
    const scoreResult = this.computeDeductiveScore(
      answerData,
      solutionConfig,
      caseData.clues,
      caseData.characters
    );

    const {
      totalScore,
      result,
      isPassed,
      isPerfect,
      dimensions,
      correctConclusions,
      missedReasoningAreas,
      recommendations,
      usefulReferences,
      missedEvidence,
      missedSupportingCodes,
      unsupportedCitations,
      feedbackSummary,
    } = scoreResult;

    // 4. Execute Evaluation & Rewards in a PostgreSQL Transaction
    const finalEvaluation = await prisma.$transaction(async (tx) => {
      // Create evaluation record
      const evalRecord = await tx.submissionEvaluation.create({
        data: {
          submissionId: submission.id,
          result,
          score: totalScore,
          feedback: {
            summary: feedbackSummary,
            dimensions,
            correctConclusions,
            missedReasoningAreas,
            evidenceFeedback: {
              usefulReferences,
              missedEvidence,
              unsupportedCitations,
            },
            recommendations,
            xpAwarded: 0, // updated below
            achievementsUnlocked: [], // updated below
          } as any,
        },
      });

      // Update submission status to EVALUATED
      await tx.caseSubmission.update({
        where: { id: submission.id },
        data: {
          status: SubmissionStatus.EVALUATED,
          submittedAt: submission.submittedAt || new Date(),
        },
      });

      // Update Investigation state
      const targetInvStatus = isPassed ? InvestigationStatus.SOLVED : InvestigationStatus.FAILED;
      await tx.investigation.update({
        where: { id: investigation.id },
        data: {
          status: targetInvStatus,
          completedAt: new Date(),
        },
      });

      // If passed, mark all chapter progress as COMPLETED
      if (isPassed) {
        await tx.investigationProgress.updateMany({
          where: { investigationId: investigation.id },
          data: {
            status: ChapterProgressStatus.COMPLETED,
            completedAt: new Date(),
          },
        });
      }

      // 5. Award XP and Achievements to Participants
      let totalXPAwarded = 0;
      const allUnlockedAchievements: string[] = [];

      if (isPassed) {
        const rewards = solutionConfig.rewards || { baseXP: 250, perfectBonusXP: 150 };
        const earnedBaseXP = isPerfect
          ? rewards.baseXP
          : Math.round(rewards.baseXP * (totalScore / 100));
        const perfectBonus = isPerfect ? rewards.perfectBonusXP : 0;
        const totalPerPlayer = earnedBaseXP + perfectBonus;

        const activeParticipants = investigation.participants.filter(
          (p) => p.status === "ACTIVE"
        );

        for (const participant of activeParticipants) {
          // Award Base Case XP
          const xpResult = await RewardService.awardXP(tx, {
            playerId: participant.playerId,
            amount: totalPerPlayer,
            reason: `Case Resolved (${isPerfect ? "Perfect" : "Partial"}): ${caseData.title}`,
            referenceKey: `xp:case_solve:${investigation.id}:${participant.playerId}`,
            investigationId: investigation.id,
          });

          if (xpResult.awarded) {
            totalXPAwarded += xpResult.amount;
          }

          // Evaluate and unlock achievements
          const unlocked = await RewardService.evaluateAndUnlockAchievements(tx, {
            playerId: participant.playerId,
            investigationId: investigation.id,
            score: totalScore,
            isPerfect,
            isCooperative: investigation.playMode === PlayMode.COOPERATIVE,
            citedAllEvidence: missedSupportingCodes.length === 0,
          });

          allUnlockedAchievements.push(...unlocked);
        }
      }

      // Update evaluation feedback with actual awarded rewards
      const updatedFeedback: EvaluationFeedbackDto = {
        summary: feedbackSummary,
        dimensions,
        correctConclusions,
        missedReasoningAreas,
        evidenceFeedback: {
          usefulReferences,
          missedEvidence,
          unsupportedCitations,
        },
        recommendations,
        xpAwarded: totalXPAwarded,
        achievementsUnlocked: Array.from(new Set(allUnlockedAchievements)),
      };

      await tx.submissionEvaluation.update({
        where: { id: evalRecord.id },
        data: { feedback: updatedFeedback as any },
      });

      return {
        ...evalRecord,
        feedback: updatedFeedback,
      };
    });

    logger.info("Case submission evaluated successfully", {
      submissionId: submission.id,
      investigationId: investigation.id,
      evaluatorPlayerId,
      score: totalScore,
      result,
    });

    return this.formatEvaluationDto(finalEvaluation);
  }

  /**
   * Formats a Prisma SubmissionEvaluation record into SafeSubmissionEvaluationDto.
   */
  private static formatEvaluationDto(evalRecord: any): SafeSubmissionEvaluationDto {
    return {
      id: evalRecord.id,
      submissionId: evalRecord.submissionId,
      result: evalRecord.result as EvaluationResult,
      score: evalRecord.score,
      feedback: evalRecord.feedback as unknown as EvaluationFeedbackDto,
      evaluatedAt: evalRecord.evaluatedAt.toISOString(),
    };
  }

  /**
   * Pure deterministic calculation of the 6 deductive scoring dimensions.
   */
  public static computeDeductiveScore(
    answerData: CaseSubmissionAnswerData,
    solutionConfig: CaseSolutionConfig,
    caseClues: { id: string; clueCode: string | null; title: string }[],
    caseCharacters: { id: string; name: string }[]
  ) {
    // Map clues for lookup
    const clueIdToCode = new Map(caseClues.map((c) => [c.id, c.clueCode || ""]));
    const clueCodeToTitle = new Map(caseClues.map((c) => [c.clueCode || "", c.title]));

    // Map characters for lookup
    const characterIdToName = new Map(caseCharacters.map((ch) => [ch.id, ch.name]));

    const criteria = solutionConfig.scoringCriteria || {
      primarySuspectWeight: 30,
      motiveWeight: 15,
      methodWeight: 15,
      timelineWeight: 15,
      supportingEvidenceWeight: 15,
      contradictingEvidenceWeight: 10,
      maxScore: 100,
      passScore: 60,
      perfectScore: 90,
    };

    // Dimension 1: Primary Suspect (30 pts)
    const isSuspectCorrect = answerData.primaryCharacterId === solutionConfig.primaryCharacterId;
    const primarySuspectScore = isSuspectCorrect ? criteria.primarySuspectWeight : 0;
    const submittedSuspectName = characterIdToName.get(answerData.primaryCharacterId) || "Unknown";

    // Dimension 2: Motive Analysis (15 pts)
    const motiveLower = (answerData.motive || "").toLowerCase();
    const motiveMatches = (solutionConfig.motiveKeywords || []).filter((kw) =>
      motiveLower.includes(kw.toLowerCase())
    );
    const motiveRatio =
      solutionConfig.motiveKeywords?.length > 0
        ? Math.min(1, motiveMatches.length / Math.ceil(solutionConfig.motiveKeywords.length * 0.5))
        : 1;
    const motiveScore = Math.round(motiveRatio * criteria.motiveWeight);

    // Dimension 3: Method & Infiltration Vector (15 pts)
    const methodLower = (answerData.method || "").toLowerCase();
    const methodMatches = (solutionConfig.methodKeywords || []).filter((kw) =>
      methodLower.includes(kw.toLowerCase())
    );
    const methodRatio =
      solutionConfig.methodKeywords?.length > 0
        ? Math.min(1, methodMatches.length / Math.ceil(solutionConfig.methodKeywords.length * 0.5))
        : 1;
    const methodScore = Math.round(methodRatio * criteria.methodWeight);

    // Dimension 4: Timeline Sequence (15 pts)
    const timelineLower = (answerData.timelineSummary || "").toLowerCase();
    const timelineMatches = (solutionConfig.timelineKeywords || []).filter((kw) =>
      timelineLower.includes(kw.toLowerCase())
    );
    const timelineRatio =
      solutionConfig.timelineKeywords?.length > 0
        ? Math.min(1, timelineMatches.length / Math.ceil(solutionConfig.timelineKeywords.length * 0.5))
        : 1;
    const timelineScore = Math.round(timelineRatio * criteria.timelineWeight);

    // Dimension 5: Supporting Evidence (15 pts)
    const citedSupportingCodes = new Set(
      (answerData.supportingEvidenceIds || [])
        .map((id) => clueIdToCode.get(id))
        .filter(Boolean) as string[]
    );
    const requiredSupporting = solutionConfig.requiredSupportingClueCodes || [];
    const matchedSupportingCodes = requiredSupporting.filter((code) =>
      citedSupportingCodes.has(code)
    );
    const missedSupportingCodes = requiredSupporting.filter(
      (code) => !citedSupportingCodes.has(code)
    );
    const supportingRatio =
      requiredSupporting.length > 0 ? matchedSupportingCodes.length / requiredSupporting.length : 1;
    const supportingScore = Math.round(supportingRatio * criteria.supportingEvidenceWeight);

    // Dimension 6: Contradicting Evidence (10 pts)
    const citedContradictingCodes = new Set(
      (answerData.contradictingEvidenceIds || [])
        .map((id) => clueIdToCode.get(id))
        .filter(Boolean) as string[]
    );
    const requiredContradicting = solutionConfig.requiredContradictingClueCodes || [];
    const matchedContradictingCodes = requiredContradicting.filter((code) =>
      citedContradictingCodes.has(code)
    );
    const missedContradictingCodes = requiredContradicting.filter(
      (code) => !citedContradictingCodes.has(code)
    );
    const contradictingRatio =
      requiredContradicting.length > 0
        ? matchedContradictingCodes.length / requiredContradicting.length
        : 1;
    const contradictingScore = Math.round(
      contradictingRatio * criteria.contradictingEvidenceWeight
    );

    // Total Score Calculation
    const totalScore = Math.min(
      criteria.maxScore,
      Math.max(
        0,
        primarySuspectScore +
          motiveScore +
          methodScore +
          timelineScore +
          supportingScore +
          contradictingScore
      )
    );

    // Result Classification
    let result: EvaluationResult;
    if (totalScore >= criteria.perfectScore && isSuspectCorrect) {
      result = EvaluationResult.SOLVED_PERFECT;
    } else if (totalScore >= criteria.passScore && isSuspectCorrect) {
      result = EvaluationResult.SOLVED_PARTIAL;
    } else {
      result = EvaluationResult.INCORRECT;
    }

    const isPassed =
      result === EvaluationResult.SOLVED_PERFECT || result === EvaluationResult.SOLVED_PARTIAL;
    const isPerfect = result === EvaluationResult.SOLVED_PERFECT;

    // Build Constructive Feedback
    const correctConclusions: string[] = [];
    const missedReasoningAreas: string[] = [];
    const recommendations: string[] = [];

    if (isSuspectCorrect) {
      correctConclusions.push(
        `Accurately identified primary perpetrator: ${submittedSuspectName}.`
      );
    } else {
      missedReasoningAreas.push(
        `Suspect misidentification: Submitted operative conclusion does not match forensic records.`
      );
      recommendations.push(
        "Cross-examine facility access badges and physical sensor timestamps to isolate perpetrator presence."
      );
    }

    if (motiveScore >= criteria.motiveWeight * 0.7) {
      correctConclusions.push("Sound motive deduction supported by operational records.");
    } else {
      missedReasoningAreas.push(
        "Motive explanation was incomplete or lacked specific operational vectors."
      );
    }

    if (methodScore >= criteria.methodWeight * 0.7) {
      correctConclusions.push("Infiltration vector and technical methodology accurately detailed.");
    } else {
      missedReasoningAreas.push("Methodology did not account for all technical override vectors.");
    }

    if (timelineScore >= criteria.timelineWeight * 0.7) {
      correctConclusions.push("Sequence of events aligns closely with recorded terminal telemetry.");
    } else {
      missedReasoningAreas.push(
        "Timeline chronology contains discrepancies regarding event window order."
      );
    }

    const dimensions: EvaluationDimensions = {
      primarySuspect: {
        score: primarySuspectScore,
        maxScore: criteria.primarySuspectWeight,
        passed: isSuspectCorrect,
        notes: isSuspectCorrect
          ? `Correct suspect identified (${submittedSuspectName}).`
          : "Incorrect prime suspect.",
      },
      motive: {
        score: motiveScore,
        maxScore: criteria.motiveWeight,
        passed: motiveScore >= criteria.motiveWeight * 0.5,
        notes: `${motiveMatches.length} motive vectors verified.`,
      },
      method: {
        score: methodScore,
        maxScore: criteria.methodWeight,
        passed: methodScore >= criteria.methodWeight * 0.5,
        notes: `${methodMatches.length} technical methods confirmed.`,
      },
      timeline: {
        score: timelineScore,
        maxScore: criteria.timelineWeight,
        passed: timelineScore >= criteria.timelineWeight * 0.5,
        notes: `${timelineMatches.length} timeline milestones matched.`,
      },
      supportingEvidence: {
        score: supportingScore,
        maxScore: criteria.supportingEvidenceWeight,
        passed: supportingScore >= criteria.supportingEvidenceWeight * 0.5,
        notes: `Cited ${matchedSupportingCodes.length}/${requiredSupporting.length} key evidence items.`,
      },
      contradictingEvidence: {
        score: contradictingScore,
        maxScore: criteria.contradictingEvidenceWeight,
        passed: contradictingScore >= criteria.contradictingEvidenceWeight * 0.5,
        notes: `Recognized ${matchedContradictingCodes.length}/${requiredContradicting.length} contradictory clues.`,
      },
    };

    const usefulReferences = matchedSupportingCodes
      .concat(matchedContradictingCodes)
      .map((code) => `${code}: ${clueCodeToTitle.get(code) || "Forensic Record"}`);

    const missedEvidence = missedSupportingCodes
      .concat(missedContradictingCodes)
      .map((code) => `${code}: ${clueCodeToTitle.get(code) || "Unexamined Clue"}`);

    const unsupportedCitations = Array.from(citedSupportingCodes)
      .concat(Array.from(citedContradictingCodes))
      .filter((code) => !requiredSupporting.includes(code) && !requiredContradicting.includes(code));

    const feedbackSummary = isPerfect
      ? "Flawless forensic deduction. The Syndicate's clandestine network has been thoroughly exposed."
      : isPassed
        ? "Substantial deduction achieved. Perpetrator identified and core operational vectors neutralized."
        : "Forensic analysis inconclusive. Critical discrepancies observed in operative indictment.";

    return {
      totalScore,
      result,
      isPassed,
      isPerfect,
      isSuspectCorrect,
      dimensions,
      correctConclusions,
      missedReasoningAreas,
      recommendations,
      usefulReferences,
      missedEvidence,
      missedSupportingCodes,
      unsupportedCitations,
      feedbackSummary,
    };
  }
}
