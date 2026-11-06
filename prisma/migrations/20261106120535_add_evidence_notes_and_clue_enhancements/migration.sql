-- AlterTable
ALTER TABLE "clues" ADD COLUMN "clueCode" TEXT;

-- AlterTable
ALTER TABLE "evidence_shares" ADD COLUMN "revokedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "evidence_notes" (
    "id" UUID NOT NULL,
    "investigationId" UUID NOT NULL,
    "clueId" UUID NOT NULL,
    "playerId" UUID NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "evidence_notes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "evidence_notes_investigationId_playerId_idx" ON "evidence_notes"("investigationId", "playerId");

-- CreateIndex
CREATE INDEX "evidence_notes_clueId_idx" ON "evidence_notes"("clueId");

-- CreateIndex
CREATE UNIQUE INDEX "evidence_notes_investigationId_clueId_playerId_key" ON "evidence_notes"("investigationId", "clueId", "playerId");

-- CreateIndex
CREATE INDEX "clues_clueCode_idx" ON "clues"("clueCode");

-- CreateIndex
CREATE UNIQUE INDEX "clues_caseId_clueCode_key" ON "clues"("caseId", "clueCode");

-- AddForeignKey
ALTER TABLE "evidence_notes" ADD CONSTRAINT "evidence_notes_investigationId_fkey" FOREIGN KEY ("investigationId") REFERENCES "investigations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence_notes" ADD CONSTRAINT "evidence_notes_clueId_fkey" FOREIGN KEY ("clueId") REFERENCES "clues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence_notes" ADD CONSTRAINT "evidence_notes_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "player_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
