import type {
  UserStatus,
  ContentStatus,
  CaseDifficulty,
  PlayMode,
  ClueType,
  ClueStrategy,
  PuzzleType,
  AchievementCategory,
  InvestigationStatus,
} from "@prisma/client";
import type { AdminPermissionAction } from "../constants/admin-permissions";

export interface AdminActorContext {
  userId: string;
  telegramId: string;
  telegramUsername?: string | null;
  displayName: string;
  roles: string[];
  permissions: Set<string>;
  isSuperAdmin: boolean;
}

export interface SafeAdminAuditLogDto {
  id: string;
  actorId: string | null;
  actorDisplayName?: string;
  action: string;
  resourceType: string;
  resourceId: string | null;
  metadata: Record<string, any> | null;
  createdAt: string;
}

export interface SafeAdminUserDto {
  id: string;
  telegramId: string;
  telegramUsername: string | null;
  firstName: string | null;
  lastName: string | null;
  status: UserStatus;
  suspensionReason: string | null;
  suspendedAt: string | null;
  lastActiveAt: string | null;
  createdAt: string;
  profile?: {
    id: string;
    codename: string;
    displayName: string;
    xp: number;
    level: number;
    avatarUrl: string | null;
  } | null;
  roles: string[];
  solvedCasesCount?: number;
}

export interface SafeAdminRoleDto {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  permissions: {
    id: string;
    action: string;
    description: string | null;
  }[];
  userCount: number;
}

export interface SafeAdminPermissionDto {
  id: string;
  action: string;
  description: string | null;
}

export interface AdminDashboardMetricsDto {
  totalPlayers: number;
  activePlayers30d: number;
  publishedCampaigns: number;
  publishedCases: number;
  activeInvestigations: number;
  completedInvestigations: number;
  totalClues: number;
  totalPuzzles: number;
  recentAuditLogs: SafeAdminAuditLogDto[];
}

export interface AdminAnalyticsMetricsDto {
  totalPlayers: number;
  activePlayers7d: number;
  activePlayers30d: number;
  investigationStarts30d: number;
  investigationCompletions30d: number;
  overallSolveRatePercent: number;
  popularCases: {
    caseCode: string;
    title: string;
    investigationCount: number;
    solvedCount: number;
    solveRatePercent: number;
  }[];
  puzzleStats: {
    totalAttempts: number;
    correctAttempts: number;
    accuracyPercent: number;
  };
}

export interface SystemSettingDto {
  key: string;
  value: any;
  description: string | null;
  updatedAt: string;
  updatedById: string | null;
}
