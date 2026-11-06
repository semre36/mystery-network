import { z } from "zod";
import {
  UserStatus,
  ContentStatus,
  CaseDifficulty,
  PlayMode,
  ClueType,
  ClueStrategy,
  PuzzleType,
  AchievementCategory,
} from "@prisma/client";

const UUID_SCHEMA = z.string().uuid("Invalid UUID identifier");

// ----------------------------------------------------------------------------
// User Moderation Schemas
// ----------------------------------------------------------------------------

export const SuspendUserSchema = z.object({
  reason: z.string().trim().min(5, "Reason must be at least 5 characters").max(500),
});

export const BanUserSchema = z.object({
  reason: z.string().trim().min(5, "Reason must be at least 5 characters").max(500),
});

export const RestoreUserSchema = z.object({
  reason: z.string().trim().max(500).optional().default("Restored by administrator"),
});

// ----------------------------------------------------------------------------
// Roles & Permissions Schemas
// ----------------------------------------------------------------------------

export const CreateRoleSchema = z.object({
  name: z.string().trim().min(3).max(50),
  description: z.string().trim().max(255).optional(),
  permissionIds: z.array(UUID_SCHEMA).optional().default([]),
});

export const UpdateRoleSchema = z.object({
  description: z.string().trim().max(255).optional(),
  permissionIds: z.array(UUID_SCHEMA).optional(),
});

export const AssignRoleSchema = z.object({
  roleId: UUID_SCHEMA,
});

// ----------------------------------------------------------------------------
// Campaign Schemas
// ----------------------------------------------------------------------------

export const CreateCampaignSchema = z.object({
  slug: z.string().trim().min(2).max(100),
  title: z.string().trim().min(3).max(150),
  description: z.string().trim().min(10),
  coverImageUrl: z.string().trim().url().optional().nullable().or(z.literal("")),
  status: z.nativeEnum(ContentStatus).optional().default(ContentStatus.DRAFT),
});

export const UpdateCampaignSchema = z.object({
  title: z.string().trim().min(3).max(150).optional(),
  description: z.string().trim().min(10).optional(),
  coverImageUrl: z.string().trim().url().optional().nullable().or(z.literal("")),
  status: z.nativeEnum(ContentStatus).optional(),
});

// ----------------------------------------------------------------------------
// Case Schemas
// ----------------------------------------------------------------------------

export const CreateCaseSchema = z.object({
  caseCode: z.string().trim().min(3).max(50),
  campaignId: UUID_SCHEMA.optional().nullable(),
  title: z.string().trim().min(3).max(150),
  description: z.string().trim().min(10),
  difficulty: z.nativeEnum(CaseDifficulty).optional().default(CaseDifficulty.MEDIUM),
  estimatedDurationMinutes: z.number().int().min(5).max(300).default(45),
  minPlayers: z.number().int().min(1).max(10).default(1),
  maxPlayers: z.number().int().min(1).max(10).default(4),
  supportedPlayModes: z
    .array(z.nativeEnum(PlayMode))
    .optional()
    .default([PlayMode.SOLO, PlayMode.COOPERATIVE]),
  status: z.nativeEnum(ContentStatus).optional().default(ContentStatus.DRAFT),
});

export const UpdateCaseSchema = z.object({
  campaignId: UUID_SCHEMA.optional().nullable(),
  title: z.string().trim().min(3).max(150).optional(),
  description: z.string().trim().min(10).optional(),
  difficulty: z.nativeEnum(CaseDifficulty).optional(),
  estimatedDurationMinutes: z.number().int().min(5).max(300).optional(),
  minPlayers: z.number().int().min(1).max(10).optional(),
  maxPlayers: z.number().int().min(1).max(10).optional(),
  supportedPlayModes: z.array(z.nativeEnum(PlayMode)).optional(),
  status: z.nativeEnum(ContentStatus).optional(),
});

export const CaseSolutionConfigSchema = z.object({
  primaryCharacterId: UUID_SCHEMA,
  motiveKeywords: z.array(z.string().trim().min(1)).min(1, "At least 1 motive keyword required"),
  methodKeywords: z.array(z.string().trim().min(1)).min(1, "At least 1 method keyword required"),
  timelineKeywords: z.array(z.string().trim().min(1)).optional().default([]),
  requiredSupportingClueCodes: z.array(z.string().trim().min(1)).optional().default([]),
  requiredContradictingClueCodes: z.array(z.string().trim().min(1)).optional().default([]),
  scoringCriteria: z
    .object({
      primarySuspectWeight: z.number().int().min(10).max(50).default(30),
      motiveWeight: z.number().int().min(5).max(30).default(15),
      methodWeight: z.number().int().min(5).max(30).default(15),
      timelineWeight: z.number().int().min(5).max(30).default(15),
      supportingEvidenceWeight: z.number().int().min(5).max(30).default(15),
      contradictingEvidenceWeight: z.number().int().min(5).max(30).default(10),
      maxScore: z.number().int().default(100),
      passScore: z.number().int().default(60),
      perfectScore: z.number().int().default(90),
    })
    .optional(),
  xpRewards: z
    .object({
      base: z.number().int().min(50).default(500),
      bonus: z.number().int().min(0).default(250),
    })
    .optional(),
});

// ----------------------------------------------------------------------------
// Chapter & Character Schemas
// ----------------------------------------------------------------------------

export const CreateChapterSchema = z.object({
  caseId: UUID_SCHEMA,
  chapterOrder: z.number().int().min(1),
  title: z.string().trim().min(2).max(150),
  description: z.string().trim().min(5),
  unlockConfig: z.record(z.string(), z.any()).optional(),
  status: z.nativeEnum(ContentStatus).optional().default(ContentStatus.DRAFT),
});

export const UpdateChapterSchema = z.object({
  chapterOrder: z.number().int().min(1).optional(),
  title: z.string().trim().min(2).max(150).optional(),
  description: z.string().trim().min(5).optional(),
  unlockConfig: z.record(z.string(), z.any()).optional(),
  status: z.nativeEnum(ContentStatus).optional(),
});

export const CreateCharacterSchema = z.object({
  caseId: UUID_SCHEMA,
  name: z.string().trim().min(2).max(100),
  description: z.string().trim().min(5),
  metadata: z.record(z.string(), z.any()).optional(),
});

export const UpdateCharacterSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  description: z.string().trim().min(5).optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

// ----------------------------------------------------------------------------
// Evidence & Clue Schemas
// ----------------------------------------------------------------------------

export const CreateClueSchema = z.object({
  caseId: UUID_SCHEMA,
  chapterId: UUID_SCHEMA.optional().nullable(),
  clueCode: z.string().trim().min(2).max(50),
  title: z.string().trim().min(2).max(150),
  description: z.string().trim().min(5),
  content: z.record(z.string(), z.any()).optional().default({}),
  clueType: z.nativeEnum(ClueType),
  assignmentStrategy: z.nativeEnum(ClueStrategy).optional().default(ClueStrategy.RANDOM),
  isShareable: z.boolean().optional().default(true),
  status: z.nativeEnum(ContentStatus).optional().default(ContentStatus.DRAFT),
});

export const UpdateClueSchema = z.object({
  chapterId: UUID_SCHEMA.optional().nullable(),
  title: z.string().trim().min(2).max(150).optional(),
  description: z.string().trim().min(5).optional(),
  content: z.record(z.string(), z.any()).optional(),
  clueType: z.nativeEnum(ClueType).optional(),
  assignmentStrategy: z.nativeEnum(ClueStrategy).optional(),
  isShareable: z.boolean().optional(),
  status: z.nativeEnum(ContentStatus).optional(),
});

// ----------------------------------------------------------------------------
// Puzzle Schemas
// ----------------------------------------------------------------------------

export const CreatePuzzleSchema = z.object({
  caseId: UUID_SCHEMA,
  chapterId: UUID_SCHEMA.optional().nullable(),
  title: z.string().trim().min(2).max(150),
  description: z.string().trim().min(5),
  instructions: z.string().trim().optional(),
  puzzleType: z.nativeEnum(PuzzleType),
  difficulty: z.nativeEnum(CaseDifficulty).optional().default(CaseDifficulty.MEDIUM),
  configuration: z.record(z.string(), z.any()).optional().default({}),
  publicConfiguration: z.record(z.string(), z.any()).optional(),
  secretConfiguration: z.record(z.string(), z.any()).optional(),
  rawSolution: z.string().trim().min(1, "Solution is required for validation"),
  maxAttempts: z.number().int().min(1).max(50).optional().nullable(),
  order: z.number().int().min(1).default(1),
  isMultiStage: z.boolean().optional().default(false),
  status: z.nativeEnum(ContentStatus).optional().default(ContentStatus.DRAFT),
});

export const UpdatePuzzleSchema = z.object({
  chapterId: UUID_SCHEMA.optional().nullable(),
  title: z.string().trim().min(2).max(150).optional(),
  description: z.string().trim().min(5).optional(),
  instructions: z.string().trim().optional(),
  puzzleType: z.nativeEnum(PuzzleType).optional(),
  difficulty: z.nativeEnum(CaseDifficulty).optional(),
  configuration: z.record(z.string(), z.any()).optional(),
  publicConfiguration: z.record(z.string(), z.any()).optional(),
  secretConfiguration: z.record(z.string(), z.any()).optional(),
  rawSolution: z.string().trim().min(1).optional(),
  maxAttempts: z.number().int().min(1).max(50).optional().nullable(),
  order: z.number().int().min(1).optional(),
  status: z.nativeEnum(ContentStatus).optional(),
});

// ----------------------------------------------------------------------------
// Rewards & XP Schemas
// ----------------------------------------------------------------------------

export const AdjustXPSchema = z.object({
  playerId: UUID_SCHEMA,
  amount: z
    .number()
    .int()
    .refine((val) => val !== 0, "Amount cannot be zero"),
  reason: z.string().trim().min(5, "Reason must be at least 5 characters").max(300),
});

export const CreateAchievementSchema = z.object({
  code: z.string().trim().min(3).max(50),
  title: z.string().trim().min(3).max(100),
  description: z.string().trim().min(5).max(300),
  iconUrl: z.string().trim().url().optional().nullable().or(z.literal("")),
  category: z.nativeEnum(AchievementCategory),
  criteria: z.record(z.string(), z.any()).optional().default({}),
});

export const UpdateAchievementSchema = z.object({
  title: z.string().trim().min(3).max(100).optional(),
  description: z.string().trim().min(5).max(300).optional(),
  iconUrl: z.string().trim().url().optional().nullable().or(z.literal("")),
  category: z.nativeEnum(AchievementCategory).optional(),
  criteria: z.record(z.string(), z.any()).optional(),
});

// ----------------------------------------------------------------------------
// System Settings & Bootstrap
// ----------------------------------------------------------------------------

export const UpdateSettingSchema = z.object({
  value: z.any(),
  description: z.string().trim().max(255).optional(),
});

export const BootstrapAdminSchema = z.object({
  targetIdentifier: z
    .string()
    .trim()
    .min(1, "Target identifier (userId, codename, or telegramId) is required"),
  bootstrapSecret: z.string().optional(),
});
