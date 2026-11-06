import { getRankForLevel } from "@/modules/players/utils/rank.util";
import type { RankTier } from "@/modules/players/types/player.types";

/**
 * Formula: Level = floor(1 + sqrt(XP / 100))
 *
 * Thresholds:
 * Level 1: 0 XP
 * Level 2: 100 XP
 * Level 3: 400 XP
 * Level 4: 900 XP
 * Level 5: 1,600 XP
 * Level 6: 2,500 XP
 * Level 7: 3,600 XP (Senior Detective)
 * Level 12: 12,100 XP (Lead Inspector)
 * Level 20: 36,100 XP (Master Sleuth)
 */
export function calculateLevelFromXP(totalXP: number): number {
  const safeXP = Math.max(0, Math.floor(totalXP || 0));
  return Math.floor(1 + Math.sqrt(safeXP / 100));
}

/**
 * Returns minimum XP required to reach a specific level.
 */
export function getXPThresholdForLevel(level: number): number {
  const safeLevel = Math.max(1, Math.floor(level));
  return Math.pow(safeLevel - 1, 2) * 100;
}

export interface LevelProgressDetails {
  currentLevel: number;
  nextLevel: number;
  totalXP: number;
  currentLevelMinXP: number;
  nextLevelMinXP: number;
  xpIntoCurrentLevel: number;
  xpNeededForNextLevel: number;
  progressPercent: number;
  rank: RankTier;
}

/**
 * Computes detailed progress towards next investigator level.
 */
export function getLevelProgress(totalXP: number): LevelProgressDetails {
  const safeXP = Math.max(0, Math.floor(totalXP || 0));
  const currentLevel = calculateLevelFromXP(safeXP);
  const nextLevel = currentLevel + 1;

  const currentLevelMinXP = getXPThresholdForLevel(currentLevel);
  const nextLevelMinXP = getXPThresholdForLevel(nextLevel);

  const xpIntoCurrentLevel = safeXP - currentLevelMinXP;
  const levelSpan = nextLevelMinXP - currentLevelMinXP;
  const xpNeededForNextLevel = Math.max(0, nextLevelMinXP - safeXP);

  const progressPercent =
    levelSpan > 0
      ? Math.min(100, Math.max(0, Math.round((xpIntoCurrentLevel / levelSpan) * 100)))
      : 100;

  const rank = getRankForLevel(currentLevel);

  return {
    currentLevel,
    nextLevel,
    totalXP: safeXP,
    currentLevelMinXP,
    nextLevelMinXP,
    xpIntoCurrentLevel,
    xpNeededForNextLevel,
    progressPercent,
    rank,
  };
}

/**
 * Returns rank title for a specific detective level.
 */
export function getRankTitle(level: number): string {
  return getRankForLevel(level).title;
}
