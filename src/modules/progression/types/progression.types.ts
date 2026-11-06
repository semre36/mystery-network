import type { AchievementCategory } from "@prisma/client";
import type { RankTier } from "@/modules/players/types/player.types";
import type { LevelProgressDetails } from "../utils/progression.util";

export interface SafeXPTransactionDto {
  id: string;
  amount: number;
  reason: string;
  referenceKey: string | null;
  investigationId: string | null;
  createdAt: string;
}

export interface SafeAchievementDto {
  id: string;
  code: string;
  title: string;
  description: string;
  iconUrl: string | null;
  category: AchievementCategory;
  criteria: Record<string, any>;
  isUnlocked: boolean;
  unlockedAt: string | null;
}

export interface PlayerProgressionDto {
  playerId: string;
  codename: string;
  displayName: string;
  totalXP: number;
  level: number;
  rank: RankTier;
  levelProgress: LevelProgressDetails;
  completedInvestigationsCount: number;
  unlockedAchievementsCount: number;
  totalAchievementsCount: number;
  recentTransactions: SafeXPTransactionDto[];
}

