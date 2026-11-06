import type { UserStatus } from "@prisma/client";

export interface RankTier {
  minLevel: number;
  title: string;
  badge: string;
  description: string;
  clearanceLevel: string;
}

export interface PlayerPreferences {
  specialization?: string;
  theme?: "navy" | "noir";
  language?: string;
  [key: string]: unknown;
}

export interface PlayerDossier {
  id: string;
  userId: string;
  codename: string;
  displayName: string;
  avatarUrl: string | null;
  xp: number;
  level: number;
  rank: RankTier;
  specialization: string;
  preferences: PlayerPreferences;
  joinedAt: string;
  lastActiveAt: string | null;
  status: UserStatus;
  telegramUsername: string | null;
}

export interface PlayerDashboardStats {
  activeInvestigations: number;
  completedInvestigations: number;
  totalCluesCollected: number;
  unlockedAchievementsCount: number;
}

export interface UnlockedAchievementSummary {
  id: string;
  code: string;
  title: string;
  description: string;
  category: string;
  iconUrl: string | null;
  unlockedAt: string;
}

export interface PlayerActivityItem {
  id: string;
  type: "ACCOUNT_CREATED" | "SESSION_AUTHENTICATED" | "PROFILE_UPDATED" | "SYSTEM_CLEARANCE";
  title: string;
  timestamp: string;
  details?: string;
}

export interface PlayerDashboardData {
  dossier: PlayerDossier;
  stats: PlayerDashboardStats;
  achievements: UnlockedAchievementSummary[];
  recentActivity: PlayerActivityItem[];
}

export interface UpdateProfileInput {
  codename?: string;
  displayName?: string;
  specialization?: string;
  theme?: "navy" | "noir";
  languageCode?: string;
}
