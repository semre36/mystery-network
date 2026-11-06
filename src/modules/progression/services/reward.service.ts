import { prisma } from "@/server/infrastructure/database";
import { logger } from "@/lib/logger";
import { calculateLevelFromXP } from "../utils/progression.util";
import { Prisma } from "@prisma/client";

export interface AwardXPParams {
  playerId: string;
  amount: number;
  reason: string;
  referenceKey?: string;
  investigationId?: string;
}

export interface AwardXPResult {
  awarded: boolean;
  amount: number;
  newXP: number;
  newLevel: number;
  transactionId?: string;
}

export interface EvaluateAchievementsParams {
  playerId: string;
  investigationId: string;
  score: number;
  isPerfect: boolean;
  isCooperative: boolean;
  citedAllEvidence: boolean;
  allPuzzlesSolved?: boolean;
}

export class RewardService {
  /**
   * Atomically and idempotently awards XP to an operative.
   * Ensures no duplicate transactions are created when a unique referenceKey is provided.
   */
  public static async awardXP(
    tx: Prisma.TransactionClient,
    params: AwardXPParams
  ): Promise<AwardXPResult> {
    const { playerId, amount, reason, referenceKey, investigationId } = params;

    if (amount <= 0) {
      const profile = await tx.playerProfile.findUnique({
        where: { id: playerId },
        select: { xp: true, level: true },
      });
      return {
        awarded: false,
        amount: 0,
        newXP: profile?.xp ?? 0,
        newLevel: profile?.level ?? 1,
      };
    }

    // 1. If referenceKey is provided, check if transaction already exists
    if (referenceKey) {
      const existingTx = await tx.xPTransaction.findUnique({
        where: { referenceKey },
      });

      if (existingTx) {
        logger.info("XP transaction skipped (already awarded via referenceKey)", {
          playerId,
          referenceKey,
          amount,
        });
        const currentProfile = await tx.playerProfile.findUnique({
          where: { id: playerId },
          select: { xp: true, level: true },
        });
        return {
          awarded: false,
          amount: 0,
          newXP: currentProfile?.xp ?? 0,
          newLevel: currentProfile?.level ?? 1,
          transactionId: existingTx.id,
        };
      }
    }

    // 2. Create the auditable XP transaction
    const newTx = await tx.xPTransaction.create({
      data: {
        playerId,
        amount,
        reason,
        referenceKey: referenceKey || null,
        investigationId: investigationId || null,
      },
    });

    // 3. Atomically update PlayerProfile XP and recalculate level
    const updatedProfile = await tx.playerProfile.update({
      where: { id: playerId },
      data: {
        xp: { increment: amount },
      },
      select: { id: true, xp: true, level: true },
    });

    const calculatedLevel = calculateLevelFromXP(updatedProfile.xp);
    if (calculatedLevel !== updatedProfile.level) {
      await tx.playerProfile.update({
        where: { id: playerId },
        data: { level: calculatedLevel },
      });
    }

    logger.info("XP awarded successfully", {
      playerId,
      amount,
      reason,
      referenceKey,
      newXP: updatedProfile.xp,
      newLevel: calculatedLevel,
    });

    return {
      awarded: true,
      amount,
      newXP: updatedProfile.xp,
      newLevel: calculatedLevel,
      transactionId: newTx.id,
    };
  }

  /**
   * Evaluates and unlocks eligible achievements for an operative upon case conclusion.
   * Completely idempotent: duplicate achievement awards are skipped safely.
   */
  public static async evaluateAndUnlockAchievements(
    tx: Prisma.TransactionClient,
    params: EvaluateAchievementsParams
  ): Promise<string[]> {
    const {
      playerId,
      investigationId,
      score,
      isPerfect,
      isCooperative,
      citedAllEvidence,
      allPuzzlesSolved,
    } = params;

    const newlyUnlockedCodes: string[] = [];

    // Query all existing registered achievements
    const allAchievements = await tx.achievement.findMany();
    const achievementMap = new Map(allAchievements.map((a) => [a.code, a]));

    // Query achievements already unlocked by this player
    const existingUnlocks = await tx.userAchievement.findMany({
      where: { playerId },
      select: { achievement: { select: { code: true } } },
    });
    const unlockedCodesSet = new Set(existingUnlocks.map((u) => u.achievement.code));

    // Helper to safely unlock
    const tryUnlock = async (code: string, bonusXP: number = 0) => {
      if (unlockedCodesSet.has(code)) return;
      const ach = achievementMap.get(code);
      if (!ach) return;

      try {
        await tx.userAchievement.create({
          data: {
            playerId,
            achievementId: ach.id,
          },
        });
        unlockedCodesSet.add(code);
        newlyUnlockedCodes.push(code);

        // Optional achievement XP
        if (bonusXP > 0) {
          await this.awardXP(tx, {
            playerId,
            amount: bonusXP,
            reason: `Achievement Unlocked: ${ach.title}`,
            referenceKey: `xp:achievement:${code}:${playerId}`,
            investigationId,
          });
        }

        logger.info("Achievement unlocked", {
          playerId,
          achievementCode: code,
          title: ach.title,
        });
      } catch (err: any) {
        // Unique constraint error if concurrent request already unlocked
        if (err.code === "P2002") {
          unlockedCodesSet.add(code);
        } else {
          throw err;
        }
      }
    };

    // 1. FIRST_CASE_SOLVED: First solved case
    if (score >= 60) {
      await tryUnlock("FIRST_CASE_SOLVED", 100);
      await tryUnlock("FIRST_LEAD", 50); // Foundational lead
    }

    // 2. PERFECT_INVESTIGATION / MASTER_SLEUTH: 100% deduction accuracy (or perfect score)
    if (isPerfect) {
      await tryUnlock("PERFECT_INVESTIGATION", 150);
      await tryUnlock("MASTER_SLEUTH", 150);
    }

    // 3. EVIDENCE_EXPERT: Cited all key supporting and contradicting clues
    if (citedAllEvidence) {
      await tryUnlock("EVIDENCE_EXPERT", 100);
    }

    // 4. TEAM_PLAYER / SQUAD_SYNERGY: Solved in cooperative mode
    if (isCooperative && score >= 60) {
      await tryUnlock("TEAM_PLAYER", 100);
      await tryUnlock("SQUAD_SYNERGY", 50);
    }

    // 5. PUZZLE_SPECIALIST: Solved all puzzles
    if (allPuzzlesSolved) {
      await tryUnlock("PUZZLE_SPECIALIST", 100);
      await tryUnlock("CIPHER_BREAKER", 50);
    }

    // 6. MASTER_DETECTIVE: Reached Senior Detective rank (level >= 7) or multiple solved cases
    const currentProfile = await tx.playerProfile.findUnique({
      where: { id: playerId },
      select: { level: true },
    });
    if (currentProfile && currentProfile.level >= 7) {
      await tryUnlock("MASTER_DETECTIVE", 200);
    }

    return newlyUnlockedCodes;
  }
}
