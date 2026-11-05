-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'BANNED', 'DELETED');

-- CreateEnum
CREATE TYPE "ContentStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "CaseDifficulty" AS ENUM ('EASY', 'MEDIUM', 'HARD', 'EXPERT');

-- CreateEnum
CREATE TYPE "PlayMode" AS ENUM ('SOLO', 'COOPERATIVE');

-- CreateEnum
CREATE TYPE "InvestigationStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'SOLVED', 'FAILED', 'ABANDONED');

-- CreateEnum
CREATE TYPE "ParticipantStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'LEFT');

-- CreateEnum
CREATE TYPE "ChapterProgressStatus" AS ENUM ('LOCKED', 'UNLOCKED', 'IN_PROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "ClueType" AS ENUM ('DOCUMENT', 'FORENSIC_ITEM', 'AUDIO_LOG', 'TESTIMONY', 'PHOTOGRAPH', 'CIPHER_FRAGMENT');

-- CreateEnum
CREATE TYPE "ClueStrategy" AS ENUM ('ALL_PLAYERS', 'ASYMMETRIC_EXCLUSIVE', 'ROLE_BASED', 'RANDOM', 'FOUND_BY_DISCOVERY');

-- CreateEnum
CREATE TYPE "AssignmentStatus" AS ENUM ('UNSEEN', 'VIEWED', 'SHARED');

-- CreateEnum
CREATE TYPE "AssetType" AS ENUM ('IMAGE', 'AUDIO', 'PDF', 'VIDEO', 'BINARY');

-- CreateEnum
CREATE TYPE "PuzzleType" AS ENUM ('CIPHER', 'LOGIC_GRID', 'PATTERN_MATCH', 'CROSS_REFERENCE', 'DECODER_WHEEL', 'AUDIO_SPECTROGRAM');

-- CreateEnum
CREATE TYPE "AttemptStatus" AS ENUM ('CORRECT', 'INCORRECT', 'PARTIAL', 'TIMEOUT');

-- CreateEnum
CREATE TYPE "TeamStatus" AS ENUM ('ACTIVE', 'DISBANDED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "TeamRole" AS ENUM ('LEAD_INVESTIGATOR', 'DETECTIVE', 'SPECIALIST');

-- CreateEnum
CREATE TYPE "MembershipStatus" AS ENUM ('ACTIVE', 'INVITED', 'LEFT', 'REMOVED');

-- CreateEnum
CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED');

-- CreateEnum
CREATE TYPE "SubmissionStatus" AS ENUM ('SUBMITTED', 'EVALUATED', 'REJECTED');

-- CreateEnum
CREATE TYPE "EvaluationResult" AS ENUM ('SOLVED_PERFECT', 'SOLVED_PARTIAL', 'INCORRECT', 'COLD_CASE');

-- CreateEnum
CREATE TYPE "AchievementCategory" AS ENUM ('DEDUCTION', 'PUZZLES', 'TEAMWORK', 'SPECIAL_EVENTS');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('CLUE_RECEIVED', 'EVIDENCE_SHARED', 'SQUAD_INVITE', 'CASE_UPDATE', 'ACHIEVEMENT_UNLOCKED', 'SYSTEM_ALERT');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "telegramId" BIGINT NOT NULL,
    "telegramUsername" TEXT,
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "lastActiveAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "player_profiles" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "codename" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "xp" INTEGER NOT NULL DEFAULT 0,
    "level" INTEGER NOT NULL DEFAULT 1,
    "preferences" JSONB DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "player_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaigns" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "coverImageUrl" TEXT,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cases" (
    "id" UUID NOT NULL,
    "caseCode" TEXT NOT NULL,
    "campaignId" UUID,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "difficulty" "CaseDifficulty" NOT NULL DEFAULT 'MEDIUM',
    "estimatedDurationMinutes" INTEGER NOT NULL,
    "minPlayers" INTEGER NOT NULL DEFAULT 1,
    "maxPlayers" INTEGER NOT NULL DEFAULT 4,
    "supportedPlayModes" "PlayMode"[],
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "case_chapters" (
    "id" UUID NOT NULL,
    "caseId" UUID NOT NULL,
    "chapterOrder" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "unlockConfig" JSONB,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "case_chapters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "case_characters" (
    "id" UUID NOT NULL,
    "caseId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "case_characters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "investigations" (
    "id" UUID NOT NULL,
    "caseId" UUID NOT NULL,
    "teamId" UUID,
    "status" "InvestigationStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "playMode" "PlayMode" NOT NULL DEFAULT 'SOLO',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "investigations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "investigation_participants" (
    "id" UUID NOT NULL,
    "investigationId" UUID NOT NULL,
    "playerId" UUID NOT NULL,
    "status" "ParticipantStatus" NOT NULL DEFAULT 'ACTIVE',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "investigation_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "investigation_progress" (
    "id" UUID NOT NULL,
    "investigationId" UUID NOT NULL,
    "chapterId" UUID NOT NULL,
    "status" "ChapterProgressStatus" NOT NULL DEFAULT 'LOCKED',
    "unlockedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "investigation_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clues" (
    "id" UUID NOT NULL,
    "caseId" UUID NOT NULL,
    "chapterId" UUID,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "clueType" "ClueType" NOT NULL,
    "assignmentStrategy" "ClueStrategy" NOT NULL DEFAULT 'RANDOM',
    "visibilityConfig" JSONB,
    "isShareable" BOOLEAN NOT NULL DEFAULT true,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clue_assignments" (
    "id" UUID NOT NULL,
    "investigationId" UUID NOT NULL,
    "clueId" UUID NOT NULL,
    "playerId" UUID NOT NULL,
    "status" "AssignmentStatus" NOT NULL DEFAULT 'UNSEEN',
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "viewedAt" TIMESTAMP(3),

    CONSTRAINT "clue_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evidence_shares" (
    "id" UUID NOT NULL,
    "investigationId" UUID NOT NULL,
    "clueAssignmentId" UUID NOT NULL,
    "sharingPlayerId" UUID NOT NULL,
    "recipientPlayerId" UUID,
    "sharedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "evidence_shares_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evidence_assets" (
    "id" UUID NOT NULL,
    "clueId" UUID,
    "assetType" "AssetType" NOT NULL,
    "storageObjectKey" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSizeBytes" BIGINT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "evidence_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "puzzles" (
    "id" UUID NOT NULL,
    "caseId" UUID NOT NULL,
    "chapterId" UUID,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "puzzleType" "PuzzleType" NOT NULL,
    "difficulty" "CaseDifficulty" NOT NULL DEFAULT 'MEDIUM',
    "configuration" JSONB NOT NULL,
    "solutionHash" TEXT NOT NULL,
    "unlockConditions" JSONB,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "puzzles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "puzzle_attempts" (
    "id" UUID NOT NULL,
    "puzzleId" UUID NOT NULL,
    "investigationId" UUID NOT NULL,
    "playerId" UUID NOT NULL,
    "submittedAnswer" TEXT NOT NULL,
    "resultStatus" "AttemptStatus" NOT NULL,
    "attemptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "evaluatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "puzzle_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teams" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "inviteCode" TEXT NOT NULL,
    "ownerId" UUID NOT NULL,
    "status" "TeamStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_memberships" (
    "id" UUID NOT NULL,
    "teamId" UUID NOT NULL,
    "playerId" UUID NOT NULL,
    "role" "TeamRole" NOT NULL DEFAULT 'DETECTIVE',
    "status" "MembershipStatus" NOT NULL DEFAULT 'ACTIVE',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "team_memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_invitations" (
    "id" UUID NOT NULL,
    "teamId" UUID NOT NULL,
    "invitationCode" TEXT NOT NULL,
    "createdById" UUID NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "team_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "case_submissions" (
    "id" UUID NOT NULL,
    "investigationId" UUID NOT NULL,
    "submittedById" UUID NOT NULL,
    "answerData" JSONB NOT NULL,
    "status" "SubmissionStatus" NOT NULL DEFAULT 'SUBMITTED',
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "case_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "submission_evaluations" (
    "id" UUID NOT NULL,
    "submissionId" UUID NOT NULL,
    "result" "EvaluationResult" NOT NULL,
    "score" INTEGER NOT NULL,
    "feedback" JSONB NOT NULL,
    "evaluatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "submission_evaluations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "xp_transactions" (
    "id" UUID NOT NULL,
    "playerId" UUID NOT NULL,
    "amount" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "investigationId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "xp_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "achievements" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "iconUrl" TEXT,
    "category" "AchievementCategory" NOT NULL,
    "criteria" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "achievements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_achievements" (
    "id" UUID NOT NULL,
    "playerId" UUID NOT NULL,
    "achievementId" UUID NOT NULL,
    "unlockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_achievements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "playerId" UUID NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "resourceRef" JSONB,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_roles" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admin_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_permissions" (
    "id" UUID NOT NULL,
    "action" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_role_permissions" (
    "id" UUID NOT NULL,
    "roleId" UUID NOT NULL,
    "permissionId" UUID NOT NULL,

    CONSTRAINT "admin_role_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_audit_logs" (
    "id" UUID NOT NULL,
    "actorId" UUID,
    "action" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_telegramId_key" ON "users"("telegramId");

-- CreateIndex
CREATE INDEX "users_telegramId_idx" ON "users"("telegramId");

-- CreateIndex
CREATE INDEX "users_status_idx" ON "users"("status");

-- CreateIndex
CREATE UNIQUE INDEX "player_profiles_userId_key" ON "player_profiles"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "player_profiles_codename_key" ON "player_profiles"("codename");

-- CreateIndex
CREATE INDEX "player_profiles_codename_idx" ON "player_profiles"("codename");

-- CreateIndex
CREATE INDEX "player_profiles_xp_idx" ON "player_profiles"("xp" DESC);

-- CreateIndex
CREATE INDEX "player_profiles_level_idx" ON "player_profiles"("level");

-- CreateIndex
CREATE UNIQUE INDEX "campaigns_slug_key" ON "campaigns"("slug");

-- CreateIndex
CREATE INDEX "campaigns_status_idx" ON "campaigns"("status");

-- CreateIndex
CREATE INDEX "campaigns_slug_idx" ON "campaigns"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "cases_caseCode_key" ON "cases"("caseCode");

-- CreateIndex
CREATE INDEX "cases_status_idx" ON "cases"("status");

-- CreateIndex
CREATE INDEX "cases_caseCode_idx" ON "cases"("caseCode");

-- CreateIndex
CREATE INDEX "cases_difficulty_idx" ON "cases"("difficulty");

-- CreateIndex
CREATE INDEX "cases_campaignId_idx" ON "cases"("campaignId");

-- CreateIndex
CREATE INDEX "case_chapters_caseId_idx" ON "case_chapters"("caseId");

-- CreateIndex
CREATE INDEX "case_chapters_status_idx" ON "case_chapters"("status");

-- CreateIndex
CREATE UNIQUE INDEX "case_chapters_caseId_chapterOrder_key" ON "case_chapters"("caseId", "chapterOrder");

-- CreateIndex
CREATE INDEX "case_characters_caseId_idx" ON "case_characters"("caseId");

-- CreateIndex
CREATE INDEX "investigations_caseId_idx" ON "investigations"("caseId");

-- CreateIndex
CREATE INDEX "investigations_teamId_idx" ON "investigations"("teamId");

-- CreateIndex
CREATE INDEX "investigations_status_idx" ON "investigations"("status");

-- CreateIndex
CREATE INDEX "investigations_startedAt_idx" ON "investigations"("startedAt");

-- CreateIndex
CREATE INDEX "investigation_participants_playerId_idx" ON "investigation_participants"("playerId");

-- CreateIndex
CREATE INDEX "investigation_participants_investigationId_idx" ON "investigation_participants"("investigationId");

-- CreateIndex
CREATE INDEX "investigation_participants_status_idx" ON "investigation_participants"("status");

-- CreateIndex
CREATE UNIQUE INDEX "investigation_participants_investigationId_playerId_key" ON "investigation_participants"("investigationId", "playerId");

-- CreateIndex
CREATE INDEX "investigation_progress_investigationId_idx" ON "investigation_progress"("investigationId");

-- CreateIndex
CREATE INDEX "investigation_progress_chapterId_idx" ON "investigation_progress"("chapterId");

-- CreateIndex
CREATE INDEX "investigation_progress_status_idx" ON "investigation_progress"("status");

-- CreateIndex
CREATE UNIQUE INDEX "investigation_progress_investigationId_chapterId_key" ON "investigation_progress"("investigationId", "chapterId");

-- CreateIndex
CREATE INDEX "clues_caseId_idx" ON "clues"("caseId");

-- CreateIndex
CREATE INDEX "clues_chapterId_idx" ON "clues"("chapterId");

-- CreateIndex
CREATE INDEX "clues_clueType_idx" ON "clues"("clueType");

-- CreateIndex
CREATE INDEX "clues_status_idx" ON "clues"("status");

-- CreateIndex
CREATE INDEX "clue_assignments_investigationId_playerId_idx" ON "clue_assignments"("investigationId", "playerId");

-- CreateIndex
CREATE INDEX "clue_assignments_clueId_idx" ON "clue_assignments"("clueId");

-- CreateIndex
CREATE INDEX "clue_assignments_status_idx" ON "clue_assignments"("status");

-- CreateIndex
CREATE UNIQUE INDEX "clue_assignments_investigationId_clueId_playerId_key" ON "clue_assignments"("investigationId", "clueId", "playerId");

-- CreateIndex
CREATE INDEX "evidence_shares_investigationId_idx" ON "evidence_shares"("investigationId");

-- CreateIndex
CREATE INDEX "evidence_shares_clueAssignmentId_idx" ON "evidence_shares"("clueAssignmentId");

-- CreateIndex
CREATE INDEX "evidence_shares_sharingPlayerId_idx" ON "evidence_shares"("sharingPlayerId");

-- CreateIndex
CREATE INDEX "evidence_shares_recipientPlayerId_idx" ON "evidence_shares"("recipientPlayerId");

-- CreateIndex
CREATE UNIQUE INDEX "evidence_assets_storageObjectKey_key" ON "evidence_assets"("storageObjectKey");

-- CreateIndex
CREATE INDEX "evidence_assets_clueId_idx" ON "evidence_assets"("clueId");

-- CreateIndex
CREATE INDEX "evidence_assets_assetType_idx" ON "evidence_assets"("assetType");

-- CreateIndex
CREATE INDEX "puzzles_caseId_idx" ON "puzzles"("caseId");

-- CreateIndex
CREATE INDEX "puzzles_chapterId_idx" ON "puzzles"("chapterId");

-- CreateIndex
CREATE INDEX "puzzles_puzzleType_idx" ON "puzzles"("puzzleType");

-- CreateIndex
CREATE INDEX "puzzles_status_idx" ON "puzzles"("status");

-- CreateIndex
CREATE INDEX "puzzle_attempts_puzzleId_idx" ON "puzzle_attempts"("puzzleId");

-- CreateIndex
CREATE INDEX "puzzle_attempts_investigationId_idx" ON "puzzle_attempts"("investigationId");

-- CreateIndex
CREATE INDEX "puzzle_attempts_playerId_idx" ON "puzzle_attempts"("playerId");

-- CreateIndex
CREATE INDEX "puzzle_attempts_attemptedAt_idx" ON "puzzle_attempts"("attemptedAt");

-- CreateIndex
CREATE UNIQUE INDEX "teams_inviteCode_key" ON "teams"("inviteCode");

-- CreateIndex
CREATE INDEX "teams_inviteCode_idx" ON "teams"("inviteCode");

-- CreateIndex
CREATE INDEX "teams_ownerId_idx" ON "teams"("ownerId");

-- CreateIndex
CREATE INDEX "teams_status_idx" ON "teams"("status");

-- CreateIndex
CREATE INDEX "team_memberships_playerId_idx" ON "team_memberships"("playerId");

-- CreateIndex
CREATE INDEX "team_memberships_teamId_idx" ON "team_memberships"("teamId");

-- CreateIndex
CREATE INDEX "team_memberships_status_idx" ON "team_memberships"("status");

-- CreateIndex
CREATE UNIQUE INDEX "team_memberships_teamId_playerId_key" ON "team_memberships"("teamId", "playerId");

-- CreateIndex
CREATE UNIQUE INDEX "team_invitations_invitationCode_key" ON "team_invitations"("invitationCode");

-- CreateIndex
CREATE INDEX "team_invitations_invitationCode_idx" ON "team_invitations"("invitationCode");

-- CreateIndex
CREATE INDEX "team_invitations_teamId_idx" ON "team_invitations"("teamId");

-- CreateIndex
CREATE INDEX "team_invitations_status_idx" ON "team_invitations"("status");

-- CreateIndex
CREATE INDEX "team_invitations_expiresAt_idx" ON "team_invitations"("expiresAt");

-- CreateIndex
CREATE INDEX "case_submissions_investigationId_idx" ON "case_submissions"("investigationId");

-- CreateIndex
CREATE INDEX "case_submissions_submittedById_idx" ON "case_submissions"("submittedById");

-- CreateIndex
CREATE INDEX "case_submissions_status_idx" ON "case_submissions"("status");

-- CreateIndex
CREATE INDEX "case_submissions_submittedAt_idx" ON "case_submissions"("submittedAt");

-- CreateIndex
CREATE UNIQUE INDEX "submission_evaluations_submissionId_key" ON "submission_evaluations"("submissionId");

-- CreateIndex
CREATE INDEX "submission_evaluations_result_idx" ON "submission_evaluations"("result");

-- CreateIndex
CREATE INDEX "submission_evaluations_score_idx" ON "submission_evaluations"("score");

-- CreateIndex
CREATE INDEX "xp_transactions_playerId_createdAt_idx" ON "xp_transactions"("playerId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "xp_transactions_investigationId_idx" ON "xp_transactions"("investigationId");

-- CreateIndex
CREATE UNIQUE INDEX "achievements_code_key" ON "achievements"("code");

-- CreateIndex
CREATE INDEX "achievements_code_idx" ON "achievements"("code");

-- CreateIndex
CREATE INDEX "achievements_category_idx" ON "achievements"("category");

-- CreateIndex
CREATE INDEX "user_achievements_playerId_idx" ON "user_achievements"("playerId");

-- CreateIndex
CREATE INDEX "user_achievements_achievementId_idx" ON "user_achievements"("achievementId");

-- CreateIndex
CREATE UNIQUE INDEX "user_achievements_playerId_achievementId_key" ON "user_achievements"("playerId", "achievementId");

-- CreateIndex
CREATE INDEX "notifications_playerId_isRead_createdAt_idx" ON "notifications"("playerId", "isRead", "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "admin_roles_name_key" ON "admin_roles"("name");

-- CreateIndex
CREATE UNIQUE INDEX "admin_permissions_action_key" ON "admin_permissions"("action");

-- CreateIndex
CREATE INDEX "admin_role_permissions_roleId_idx" ON "admin_role_permissions"("roleId");

-- CreateIndex
CREATE INDEX "admin_role_permissions_permissionId_idx" ON "admin_role_permissions"("permissionId");

-- CreateIndex
CREATE UNIQUE INDEX "admin_role_permissions_roleId_permissionId_key" ON "admin_role_permissions"("roleId", "permissionId");

-- CreateIndex
CREATE INDEX "admin_audit_logs_actorId_idx" ON "admin_audit_logs"("actorId");

-- CreateIndex
CREATE INDEX "admin_audit_logs_action_idx" ON "admin_audit_logs"("action");

-- CreateIndex
CREATE INDEX "admin_audit_logs_resourceType_resourceId_idx" ON "admin_audit_logs"("resourceType", "resourceId");

-- CreateIndex
CREATE INDEX "admin_audit_logs_createdAt_idx" ON "admin_audit_logs"("createdAt" DESC);

-- AddForeignKey
ALTER TABLE "player_profiles" ADD CONSTRAINT "player_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cases" ADD CONSTRAINT "cases_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_chapters" ADD CONSTRAINT "case_chapters_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_characters" ADD CONSTRAINT "case_characters_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "investigations" ADD CONSTRAINT "investigations_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "investigations" ADD CONSTRAINT "investigations_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "investigation_participants" ADD CONSTRAINT "investigation_participants_investigationId_fkey" FOREIGN KEY ("investigationId") REFERENCES "investigations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "investigation_participants" ADD CONSTRAINT "investigation_participants_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "player_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "investigation_progress" ADD CONSTRAINT "investigation_progress_investigationId_fkey" FOREIGN KEY ("investigationId") REFERENCES "investigations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "investigation_progress" ADD CONSTRAINT "investigation_progress_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "case_chapters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clues" ADD CONSTRAINT "clues_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clues" ADD CONSTRAINT "clues_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "case_chapters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clue_assignments" ADD CONSTRAINT "clue_assignments_investigationId_fkey" FOREIGN KEY ("investigationId") REFERENCES "investigations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clue_assignments" ADD CONSTRAINT "clue_assignments_clueId_fkey" FOREIGN KEY ("clueId") REFERENCES "clues"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clue_assignments" ADD CONSTRAINT "clue_assignments_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "player_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence_shares" ADD CONSTRAINT "evidence_shares_investigationId_fkey" FOREIGN KEY ("investigationId") REFERENCES "investigations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence_shares" ADD CONSTRAINT "evidence_shares_clueAssignmentId_fkey" FOREIGN KEY ("clueAssignmentId") REFERENCES "clue_assignments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence_shares" ADD CONSTRAINT "evidence_shares_sharingPlayerId_fkey" FOREIGN KEY ("sharingPlayerId") REFERENCES "player_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence_shares" ADD CONSTRAINT "evidence_shares_recipientPlayerId_fkey" FOREIGN KEY ("recipientPlayerId") REFERENCES "player_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence_assets" ADD CONSTRAINT "evidence_assets_clueId_fkey" FOREIGN KEY ("clueId") REFERENCES "clues"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "puzzles" ADD CONSTRAINT "puzzles_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "puzzles" ADD CONSTRAINT "puzzles_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "case_chapters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "puzzle_attempts" ADD CONSTRAINT "puzzle_attempts_puzzleId_fkey" FOREIGN KEY ("puzzleId") REFERENCES "puzzles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "puzzle_attempts" ADD CONSTRAINT "puzzle_attempts_investigationId_fkey" FOREIGN KEY ("investigationId") REFERENCES "investigations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "puzzle_attempts" ADD CONSTRAINT "puzzle_attempts_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "player_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teams" ADD CONSTRAINT "teams_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "player_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_memberships" ADD CONSTRAINT "team_memberships_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_memberships" ADD CONSTRAINT "team_memberships_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "player_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_invitations" ADD CONSTRAINT "team_invitations_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_invitations" ADD CONSTRAINT "team_invitations_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "player_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_submissions" ADD CONSTRAINT "case_submissions_investigationId_fkey" FOREIGN KEY ("investigationId") REFERENCES "investigations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_submissions" ADD CONSTRAINT "case_submissions_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "player_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submission_evaluations" ADD CONSTRAINT "submission_evaluations_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "case_submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "xp_transactions" ADD CONSTRAINT "xp_transactions_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "player_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "xp_transactions" ADD CONSTRAINT "xp_transactions_investigationId_fkey" FOREIGN KEY ("investigationId") REFERENCES "investigations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_achievements" ADD CONSTRAINT "user_achievements_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "player_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_achievements" ADD CONSTRAINT "user_achievements_achievementId_fkey" FOREIGN KEY ("achievementId") REFERENCES "achievements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "player_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_role_permissions" ADD CONSTRAINT "admin_role_permissions_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "admin_roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_role_permissions" ADD CONSTRAINT "admin_role_permissions_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "admin_permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_audit_logs" ADD CONSTRAINT "admin_audit_logs_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
