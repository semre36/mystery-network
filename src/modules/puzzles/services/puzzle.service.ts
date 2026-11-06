import { prisma } from "@/server/infrastructure/database";
import { AppError } from "@/lib/errors/app-error";
import { logger } from "@/lib/logger";
import {
  ContentStatus,
  AttemptStatus,
  PuzzleProgressStatus,
  ChapterProgressStatus,
  InvestigationStatus,
} from "@prisma/client";
import {
  SafePuzzleSummaryDto,
  SafePuzzleDetailDto,
  SafePuzzleStageDto,
  SafePuzzleHintDto,
  SafePuzzleAttemptDto,
  SafePuzzleAttemptResultDto,
} from "../types/puzzle.types";
import { PuzzleGuard } from "../guards/puzzle.guard";
import { PuzzleValidatorRegistry } from "../validators";
import { SubmitPuzzleAttemptInput } from "../validation/puzzle.schema";

export class PuzzleService {
  /**
   * Retrieves all puzzles associated with an active investigation's case.
   * Redacts all secret solution data and accurately reflects investigation-level completion state.
   */
  public static async getPuzzles(
    userId: string,
    investigationId: string
  ): Promise<SafePuzzleSummaryDto[]> {
    const playerId = await PuzzleGuard.getPlayerProfileId(userId);

    const investigation = await prisma.investigation.findUnique({
      where: { id: investigationId },
      include: {
        participants: {
          where: { playerId },
        },
        progress: {
          include: { chapter: true },
        },
      },
    });

    if (!investigation || investigation.participants.length === 0) {
      throw new AppError(
        "Investigation session not found or restricted",
        404,
        "INVESTIGATION_NOT_FOUND"
      );
    }

    // Active squad membership check
    if (
      investigation.teamId &&
      (investigation.status === InvestigationStatus.IN_PROGRESS ||
        investigation.status === InvestigationStatus.PAUSED ||
        investigation.status === InvestigationStatus.NOT_STARTED)
    ) {
      const membership = await prisma.teamMembership.findUnique({
        where: {
          teamId_playerId: {
            teamId: investigation.teamId,
            playerId,
          },
        },
      });

      if (!membership || membership.status !== "ACTIVE") {
        throw new AppError(
          "Investigation session not found or restricted",
          404,
          "INVESTIGATION_NOT_FOUND"
        );
      }
    }

    // Unlocked chapters lookup
    const unlockedChapterIds = new Set<string>();
    for (const prog of investigation.progress) {
      if (
        prog.status === ChapterProgressStatus.UNLOCKED ||
        prog.status === ChapterProgressStatus.IN_PROGRESS ||
        prog.status === ChapterProgressStatus.COMPLETED
      ) {
        unlockedChapterIds.add(prog.chapterId);
      }
    }

    // Fetch published puzzles for the case
    const puzzles = await prisma.puzzle.findMany({
      where: {
        caseId: investigation.caseId,
        status: ContentStatus.PUBLISHED,
      },
      include: {
        chapter: {
          select: { id: true, title: true, chapterOrder: true },
        },
        _count: {
          select: { stages: true },
        },
      },
      orderBy: [{ chapter: { chapterOrder: "asc" } }, { order: "asc" }, { createdAt: "asc" }],
    });

    // Fetch existing puzzle progress for this investigation
    const progressRecords = await prisma.puzzleProgress.findMany({
      where: { investigationId },
      include: {
        solvedBy: { select: { codename: true } },
      },
    });
    const progressMap = new Map(progressRecords.map((p) => [p.puzzleId, p]));

    // Fetch attempt counts
    const attempts = await prisma.puzzleAttempt.findMany({
      where: { investigationId },
      select: { puzzleId: true, playerId: true },
    });

    const totalAttemptsMap = new Map<string, number>();
    const myAttemptsMap = new Map<string, number>();

    for (const att of attempts) {
      totalAttemptsMap.set(att.puzzleId, (totalAttemptsMap.get(att.puzzleId) ?? 0) + 1);
      if (att.playerId === playerId) {
        myAttemptsMap.set(att.puzzleId, (myAttemptsMap.get(att.puzzleId) ?? 0) + 1);
      }
    }

    return puzzles.map((puzzle) => {
      const isChapterLocked = puzzle.chapterId ? !unlockedChapterIds.has(puzzle.chapterId) : false;
      const progress = progressMap.get(puzzle.id);

      let progressStatus: PuzzleProgressStatus = PuzzleProgressStatus.UNLOCKED;
      if (isChapterLocked) {
        progressStatus = PuzzleProgressStatus.LOCKED;
      } else if (progress) {
        progressStatus = progress.status;
      }

      return {
        id: puzzle.id,
        caseId: puzzle.caseId,
        chapterId: puzzle.chapterId,
        chapterTitle: puzzle.chapter?.title ?? null,
        chapterOrder: puzzle.chapter?.chapterOrder ?? null,
        title: puzzle.title,
        description: puzzle.description,
        puzzleType: puzzle.puzzleType,
        difficulty: puzzle.difficulty,
        status: puzzle.status,
        order: puzzle.order,
        isMultiStage: puzzle.isMultiStage,
        stageCount: puzzle._count?.stages ?? (puzzle as any).stages?.length ?? 0,
        maxAttempts: puzzle.maxAttempts,
        progressStatus,
        currentStageOrder: progress ? progress.currentStageOrder : 1,
        completedAt: progress?.completedAt ? progress.completedAt.toISOString() : null,
        solvedByCodename: progress?.solvedBy?.codename ?? null,
        totalAttemptsCount: totalAttemptsMap.get(puzzle.id) ?? 0,
        myAttemptsCount: myAttemptsMap.get(puzzle.id) ?? 0,
        isLocked: isChapterLocked,
      };
    });
  }

  /**
   * Retrieves the comprehensive detail and state of a puzzle for the authenticated operative.
   * Redacts all secret configuration, solution hashes, and future locked stages.
   */
  public static async getPuzzleDetail(
    userId: string,
    investigationId: string,
    puzzleId: string
  ): Promise<SafePuzzleDetailDto> {
    const { investigation, puzzle, playerId } = await PuzzleGuard.verifyPuzzleAccess(
      userId,
      investigationId,
      puzzleId
    );

    // 1. Fetch or initialize PuzzleProgress record
    let progress = await prisma.puzzleProgress.findUnique({
      where: {
        puzzleId_investigationId: {
          puzzleId: puzzle.id,
          investigationId,
        },
      },
      include: {
        solvedBy: { select: { codename: true } },
      },
    });

    if (!progress) {
      progress = await prisma.puzzleProgress.create({
        data: {
          puzzleId: puzzle.id,
          investigationId,
          status: PuzzleProgressStatus.IN_PROGRESS,
          currentStageOrder: 1,
        },
        include: {
          solvedBy: { select: { codename: true } },
        },
      });
    }

    // 2. Fetch unlocked hints for this investigation
    const unlockedHints = await prisma.investigationUnlockedHint.findMany({
      where: { investigationId },
      select: { hintId: true },
    });
    const unlockedHintIds = new Set(unlockedHints.map((h) => h.hintId));

    // 3. Format stages
    const currentStageOrder = progress.currentStageOrder;
    const isPuzzleSolved = progress.status === PuzzleProgressStatus.SOLVED;

    const safeStages: SafePuzzleStageDto[] = puzzle.stages.map((stage: any) => {
      const isCompleted = isPuzzleSolved || stage.stageOrder < currentStageOrder;
      const isCurrent = !isPuzzleSolved && stage.stageOrder === currentStageOrder;
      const isLocked = !isPuzzleSolved && stage.stageOrder > currentStageOrder;

      return {
        id: stage.id,
        puzzleId: puzzle.id,
        stageOrder: stage.stageOrder,
        title: stage.title,
        instructions: isLocked ? null : stage.instructions,
        puzzleType: stage.puzzleType ?? puzzle.puzzleType,
        publicConfiguration: isLocked ? {} : stage.publicConfiguration,
        maxAttempts: stage.maxAttempts,
        isCompleted,
        isCurrent,
        isLocked,
      };
    });

    const currentStage =
      safeStages.find((s) => s.isCurrent) ?? (isPuzzleSolved ? null : (safeStages[0] ?? null));

    // 4. Format hints
    const safeHints: SafePuzzleHintDto[] = puzzle.hints.map((hint: any) => {
      const isUnlocked = unlockedHintIds.has(hint.id);
      return {
        id: hint.id,
        puzzleId: puzzle.id,
        stageId: hint.stageId,
        hintOrder: hint.hintOrder,
        title: hint.title,
        content: isUnlocked ? hint.content : null,
        isUnlocked,
        unlockConditions: hint.unlockConditions,
      };
    });

    // 5. Compute attempt stats
    const totalAttemptsCount = await prisma.puzzleAttempt.count({
      where: { puzzleId: puzzle.id, investigationId },
    });

    const myAttemptsCount = await prisma.puzzleAttempt.count({
      where: { puzzleId: puzzle.id, investigationId, playerId },
    });

    const maxAttempts = currentStage?.maxAttempts ?? puzzle.maxAttempts;
    const remainingAttempts =
      typeof maxAttempts === "number" ? Math.max(0, maxAttempts - totalAttemptsCount) : null;
    const myRemainingAttempts =
      typeof maxAttempts === "number" ? Math.max(0, maxAttempts - myAttemptsCount) : null;

    return {
      id: puzzle.id,
      caseId: puzzle.caseId,
      chapterId: puzzle.chapterId,
      chapterTitle: puzzle.chapter?.title ?? null,
      chapterOrder: puzzle.chapter?.chapterOrder ?? null,
      title: puzzle.title,
      description: puzzle.description,
      instructions: puzzle.instructions,
      puzzleType: puzzle.puzzleType,
      difficulty: puzzle.difficulty,
      status: puzzle.status,
      order: puzzle.order,
      isMultiStage: puzzle.isMultiStage,
      stageCount: puzzle.stages.length,
      maxAttempts: puzzle.maxAttempts,
      progressStatus: progress.status,
      currentStageOrder,
      completedAt: progress.completedAt ? progress.completedAt.toISOString() : null,
      solvedByCodename: progress.solvedBy?.codename ?? null,
      totalAttemptsCount,
      myAttemptsCount,
      isLocked: false,
      publicConfiguration: puzzle.publicConfiguration ?? puzzle.configuration ?? {},
      currentStage,
      stages: safeStages,
      hints: safeHints,
      remainingAttempts,
      myRemainingAttempts,
    };
  }

  /**
   * Submits an answer attempt for evaluation.
   * Concurrency-safe: Runs in an interactive transaction with PostgreSQL advisory locking.
   */
  public static async submitAttempt(
    userId: string,
    investigationId: string,
    puzzleId: string,
    input: SubmitPuzzleAttemptInput
  ): Promise<SafePuzzleAttemptResultDto> {
    const { investigation, puzzle, playerId } = await PuzzleGuard.verifyPuzzleAccess(
      userId,
      investigationId,
      puzzleId
    );

    if (
      investigation.status === InvestigationStatus.SOLVED ||
      investigation.status === InvestigationStatus.ABANDONED ||
      investigation.status === InvestigationStatus.FAILED
    ) {
      throw new AppError(
        "Investigation session has concluded. No further challenge submissions accepted.",
        400,
        "INVESTIGATION_CONCLUDED"
      );
    }

    return await prisma.$transaction(async (tx) => {
      // Concurrency lock scoped to (investigationId, puzzleId)
      if (typeof tx.$executeRaw === "function") {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${investigationId}), hashtext(${puzzleId}))`;
      }

      // 1. Fetch or initialize PuzzleProgress
      let progress = await tx.puzzleProgress.findUnique({
        where: {
          puzzleId_investigationId: {
            puzzleId,
            investigationId,
          },
        },
      });

      if (!progress) {
        progress = await tx.puzzleProgress.create({
          data: {
            puzzleId,
            investigationId,
            status: PuzzleProgressStatus.IN_PROGRESS,
            currentStageOrder: 1,
          },
        });
      }

      if (progress.status === PuzzleProgressStatus.SOLVED) {
        throw new AppError(
          "This challenge has already been solved by your investigation squad.",
          400,
          "PUZZLE_ALREADY_SOLVED"
        );
      }

      // 2. Identify the target stage to evaluate
      let targetStage: any = null;
      let effectivePuzzleType = puzzle.puzzleType;
      let effectivePublicConfig = puzzle.publicConfiguration ?? puzzle.configuration;
      let effectiveSecretConfig = puzzle.secretConfiguration ?? puzzle.configuration;
      let effectiveSolutionHash = puzzle.solutionHash;
      let effectiveMaxAttempts = puzzle.maxAttempts;

      if (puzzle.isMultiStage && puzzle.stages.length > 0) {
        if (input.stageId) {
          targetStage = PuzzleGuard.verifyStageAccess(
            puzzle,
            input.stageId,
            progress.currentStageOrder
          );
        } else {
          targetStage = puzzle.stages.find((s: any) => s.stageOrder === progress.currentStageOrder);
          if (!targetStage) {
            targetStage = puzzle.stages[puzzle.stages.length - 1];
          }
        }

        effectivePuzzleType = targetStage.puzzleType ?? puzzle.puzzleType;
        effectivePublicConfig = targetStage.publicConfiguration;
        effectiveSecretConfig = targetStage.secretConfiguration ?? {};
        effectiveSolutionHash = targetStage.solutionHash;
        effectiveMaxAttempts = targetStage.maxAttempts ?? puzzle.maxAttempts;
      }

      // 3. Check attempt limits (scoped to operative, puzzle, stage, and investigation)
      const attemptWhere: any = {
        puzzleId,
        investigationId,
        playerId,
        ...(targetStage ? { stageId: targetStage.id } : {}),
      };

      const existingAttemptsCount = await tx.puzzleAttempt.count({
        where: attemptWhere,
      });

      if (
        typeof effectiveMaxAttempts === "number" &&
        existingAttemptsCount >= effectiveMaxAttempts
      ) {
        throw new AppError(
          "Maximum submission attempts exceeded for this challenge.",
          429,
          "ATTEMPT_LIMIT_REACHED"
        );
      }

      // 4. Select validator and evaluate answer
      const validator = PuzzleValidatorRegistry.getValidator(
        effectivePuzzleType,
        effectivePublicConfig
      );

      const outcome = validator.validate({
        submittedAnswer: input.answer,
        publicConfig: effectivePublicConfig,
        secretConfig: effectiveSecretConfig,
        solutionHash: effectiveSolutionHash,
      });

      // 5. Record individual attempt
      await tx.puzzleAttempt.create({
        data: {
          puzzleId,
          stageId: targetStage ? targetStage.id : null,
          investigationId,
          playerId,
          submittedAnswer: input.answer.trim().slice(0, 1000), // sanitize / cap length
          resultStatus: outcome.resultStatus,
          isCorrect: outcome.isCorrect,
          attemptedAt: new Date(),
          evaluatedAt: new Date(),
        },
      });

      const newAttemptsCount = existingAttemptsCount + 1;
      const remainingAttempts =
        typeof effectiveMaxAttempts === "number"
          ? Math.max(0, effectiveMaxAttempts - newAttemptsCount)
          : null;

      let isStageCompleted = false;
      let isPuzzleCompleted = false;
      let nextStageOrder: number | null = null;
      let completedAt: string | null = null;

      // 6. Handle successful progression
      if (outcome.isCorrect) {
        isStageCompleted = true;

        if (puzzle.isMultiStage && puzzle.stages.length > 0) {
          const isFinalStage = targetStage.stageOrder >= puzzle.stages.length;

          if (isFinalStage) {
            // All stages complete -> puzzle is SOLVED
            isPuzzleCompleted = true;
            const now = new Date();
            completedAt = now.toISOString();

            await tx.puzzleProgress.update({
              where: { id: progress.id },
              data: {
                status: PuzzleProgressStatus.SOLVED,
                completedAt: now,
                solvedByPlayerId: playerId,
              },
            });
          } else {
            // Advance to next stage
            nextStageOrder = targetStage.stageOrder + 1;
            await tx.puzzleProgress.update({
              where: { id: progress.id },
              data: {
                currentStageOrder: targetStage.stageOrder + 1,
              },
            });
          }
        } else {
          // Single-stage puzzle solved
          isPuzzleCompleted = true;
          const now = new Date();
          completedAt = now.toISOString();

          await tx.puzzleProgress.update({
            where: { id: progress.id },
            data: {
              status: PuzzleProgressStatus.SOLVED,
              completedAt: now,
              solvedByPlayerId: playerId,
            },
          });
        }

        logger.info("Puzzle challenge solved", {
          puzzleId,
          investigationId,
          playerId,
          isPuzzleCompleted,
          isStageCompleted,
          stageOrder: targetStage?.stageOrder ?? 1,
        });
      } else {
        logger.info("Puzzle attempt failed", {
          puzzleId,
          investigationId,
          playerId,
          attemptsUsed: newAttemptsCount,
        });
      }

      return {
        isCorrect: outcome.isCorrect,
        resultStatus: outcome.resultStatus,
        feedback:
          outcome.feedback ??
          (outcome.isCorrect ? "Correct answer verified!" : "Incorrect submission."),
        attemptsUsed: newAttemptsCount,
        remainingAttempts,
        isStageCompleted,
        isPuzzleCompleted,
        nextStageOrder,
        currentStageOrder: nextStageOrder ?? progress.currentStageOrder,
        completedAt,
      };
    });
  }

  /**
   * Retrieves chronological attempt history for this challenge.
   */
  public static async getAttemptHistory(
    userId: string,
    investigationId: string,
    puzzleId: string
  ): Promise<SafePuzzleAttemptDto[]> {
    const { playerId } = await PuzzleGuard.verifyPuzzleAccess(userId, investigationId, puzzleId);

    const attempts = await prisma.puzzleAttempt.findMany({
      where: {
        puzzleId,
        investigationId,
      },
      include: {
        player: { select: { codename: true } },
        stage: { select: { stageOrder: true } },
      },
      orderBy: { attemptedAt: "desc" },
      take: 50,
    });

    return attempts.map((att) => ({
      id: att.id,
      puzzleId: att.puzzleId,
      stageId: att.stageId,
      stageOrder: att.stage?.stageOrder ?? null,
      submittedAnswer: att.submittedAnswer,
      resultStatus: att.resultStatus,
      isCorrect: att.isCorrect,
      attemptedAt: att.attemptedAt.toISOString(),
      playerCodename: att.player.codename,
      isMine: att.playerId === playerId,
    }));
  }

  /**
   * Unlocks a progressive hint for an active investigation.
   * Shared cooperatively: Unlocking a hint makes it visible to all active squad participants.
   */
  public static async unlockHint(
    userId: string,
    investigationId: string,
    puzzleId: string,
    hintId: string
  ): Promise<SafePuzzleHintDto> {
    const { puzzle, playerId } = await PuzzleGuard.verifyPuzzleAccess(
      userId,
      investigationId,
      puzzleId
    );

    const hint = puzzle.hints.find((h: any) => h.id === hintId);
    if (!hint) {
      throw new AppError("Investigation hint not found", 404, "HINT_NOT_FOUND");
    }

    // Check if already unlocked
    const existing = await prisma.investigationUnlockedHint.findUnique({
      where: {
        investigationId_hintId: {
          investigationId,
          hintId,
        },
      },
    });

    if (existing) {
      return {
        id: hint.id,
        puzzleId: puzzle.id,
        stageId: hint.stageId,
        hintOrder: hint.hintOrder,
        title: hint.title,
        content: hint.content,
        isUnlocked: true,
        unlockConditions: hint.unlockConditions,
      };
    }

    // Validate unlock conditions (e.g. minAttempts)
    if (hint.unlockConditions && typeof hint.unlockConditions === "object") {
      const minAttempts = (hint.unlockConditions as any).minAttempts;
      if (typeof minAttempts === "number") {
        const attemptsCount = await prisma.puzzleAttempt.count({
          where: { puzzleId, investigationId },
        });

        if (attemptsCount < minAttempts) {
          throw new AppError(
            `This tactical hint unlocks after ${minAttempts} attempts. Current attempts: ${attemptsCount}`,
            400,
            "HINT_CONDITIONS_NOT_MET"
          );
        }
      }
    }

    // Atomically register unlocked hint (idempotent under concurrency)
    await prisma.investigationUnlockedHint.upsert({
      where: {
        investigationId_hintId: {
          investigationId,
          hintId: hint.id,
        },
      },
      update: {},
      create: {
        investigationId,
        hintId: hint.id,
        unlockedByPlayerId: playerId,
        unlockedAt: new Date(),
      },
    });

    logger.info("Investigation hint unlocked", {
      investigationId,
      puzzleId,
      hintId,
      unlockedByPlayerId: playerId,
    });

    return {
      id: hint.id,
      puzzleId: puzzle.id,
      stageId: hint.stageId,
      hintOrder: hint.hintOrder,
      title: hint.title,
      content: hint.content,
      isUnlocked: true,
      unlockConditions: hint.unlockConditions,
    };
  }
}
