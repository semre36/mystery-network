-- CreateEnum
CREATE TYPE "PuzzleProgressStatus" AS ENUM ('LOCKED', 'UNLOCKED', 'IN_PROGRESS', 'SOLVED', 'FAILED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "PuzzleType" ADD VALUE 'CAESAR_CIPHER';
ALTER TYPE "PuzzleType" ADD VALUE 'SUBSTITUTION_CIPHER';
ALTER TYPE "PuzzleType" ADD VALUE 'VIGENERE_CIPHER';
ALTER TYPE "PuzzleType" ADD VALUE 'HIDDEN_MESSAGE';
ALTER TYPE "PuzzleType" ADD VALUE 'LOGIC_CHALLENGE';
ALTER TYPE "PuzzleType" ADD VALUE 'ACCESS_CODE';
ALTER TYPE "PuzzleType" ADD VALUE 'MULTI_STAGE';

-- AlterTable
ALTER TABLE "puzzle_attempts" ADD COLUMN     "isCorrect" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "stageId" UUID;

-- AlterTable
ALTER TABLE "puzzles" ADD COLUMN     "instructions" TEXT,
ADD COLUMN     "isMultiStage" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "maxAttempts" INTEGER,
ADD COLUMN     "order" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "publicConfiguration" JSONB,
ADD COLUMN     "secretConfiguration" JSONB;

-- CreateTable
CREATE TABLE "puzzle_stages" (
    "id" UUID NOT NULL,
    "puzzleId" UUID NOT NULL,
    "stageOrder" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "instructions" TEXT,
    "puzzleType" "PuzzleType",
    "publicConfiguration" JSONB NOT NULL,
    "secretConfiguration" JSONB,
    "solutionHash" TEXT,
    "maxAttempts" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "puzzle_stages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "puzzle_progress" (
    "id" UUID NOT NULL,
    "puzzleId" UUID NOT NULL,
    "investigationId" UUID NOT NULL,
    "status" "PuzzleProgressStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "currentStageOrder" INTEGER NOT NULL DEFAULT 1,
    "completedAt" TIMESTAMP(3),
    "solvedByPlayerId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "puzzle_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "puzzle_hints" (
    "id" UUID NOT NULL,
    "puzzleId" UUID NOT NULL,
    "stageId" UUID,
    "hintOrder" INTEGER NOT NULL,
    "title" TEXT,
    "content" TEXT NOT NULL,
    "unlockConditions" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "puzzle_hints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "investigation_unlocked_hints" (
    "id" UUID NOT NULL,
    "investigationId" UUID NOT NULL,
    "hintId" UUID NOT NULL,
    "unlockedByPlayerId" UUID NOT NULL,
    "unlockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "investigation_unlocked_hints_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "puzzle_stages_puzzleId_idx" ON "puzzle_stages"("puzzleId");

-- CreateIndex
CREATE UNIQUE INDEX "puzzle_stages_puzzleId_stageOrder_key" ON "puzzle_stages"("puzzleId", "stageOrder");

-- CreateIndex
CREATE INDEX "puzzle_progress_investigationId_idx" ON "puzzle_progress"("investigationId");

-- CreateIndex
CREATE INDEX "puzzle_progress_puzzleId_idx" ON "puzzle_progress"("puzzleId");

-- CreateIndex
CREATE INDEX "puzzle_progress_status_idx" ON "puzzle_progress"("status");

-- CreateIndex
CREATE UNIQUE INDEX "puzzle_progress_puzzleId_investigationId_key" ON "puzzle_progress"("puzzleId", "investigationId");

-- CreateIndex
CREATE INDEX "puzzle_hints_puzzleId_idx" ON "puzzle_hints"("puzzleId");

-- CreateIndex
CREATE INDEX "puzzle_hints_stageId_idx" ON "puzzle_hints"("stageId");

-- CreateIndex
CREATE UNIQUE INDEX "puzzle_hints_puzzleId_hintOrder_key" ON "puzzle_hints"("puzzleId", "hintOrder");

-- CreateIndex
CREATE INDEX "investigation_unlocked_hints_investigationId_idx" ON "investigation_unlocked_hints"("investigationId");

-- CreateIndex
CREATE INDEX "investigation_unlocked_hints_hintId_idx" ON "investigation_unlocked_hints"("hintId");

-- CreateIndex
CREATE UNIQUE INDEX "investigation_unlocked_hints_investigationId_hintId_key" ON "investigation_unlocked_hints"("investigationId", "hintId");

-- CreateIndex
CREATE INDEX "puzzle_attempts_stageId_idx" ON "puzzle_attempts"("stageId");

-- AddForeignKey
ALTER TABLE "puzzle_stages" ADD CONSTRAINT "puzzle_stages_puzzleId_fkey" FOREIGN KEY ("puzzleId") REFERENCES "puzzles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "puzzle_attempts" ADD CONSTRAINT "puzzle_attempts_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "puzzle_stages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "puzzle_progress" ADD CONSTRAINT "puzzle_progress_puzzleId_fkey" FOREIGN KEY ("puzzleId") REFERENCES "puzzles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "puzzle_progress" ADD CONSTRAINT "puzzle_progress_investigationId_fkey" FOREIGN KEY ("investigationId") REFERENCES "investigations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "puzzle_progress" ADD CONSTRAINT "puzzle_progress_solvedByPlayerId_fkey" FOREIGN KEY ("solvedByPlayerId") REFERENCES "player_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "puzzle_hints" ADD CONSTRAINT "puzzle_hints_puzzleId_fkey" FOREIGN KEY ("puzzleId") REFERENCES "puzzles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "puzzle_hints" ADD CONSTRAINT "puzzle_hints_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "puzzle_stages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "investigation_unlocked_hints" ADD CONSTRAINT "investigation_unlocked_hints_investigationId_fkey" FOREIGN KEY ("investigationId") REFERENCES "investigations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "investigation_unlocked_hints" ADD CONSTRAINT "investigation_unlocked_hints_hintId_fkey" FOREIGN KEY ("hintId") REFERENCES "puzzle_hints"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "investigation_unlocked_hints" ADD CONSTRAINT "investigation_unlocked_hints_unlockedByPlayerId_fkey" FOREIGN KEY ("unlockedByPlayerId") REFERENCES "player_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
