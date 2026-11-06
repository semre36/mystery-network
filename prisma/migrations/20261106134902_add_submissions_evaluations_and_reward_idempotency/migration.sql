-- AlterTable
ALTER TABLE "case_submissions" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "title" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "status" SET DEFAULT 'DRAFT',
ALTER COLUMN "submittedAt" DROP NOT NULL,
ALTER COLUMN "submittedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "cases" ADD COLUMN     "solutionConfig" JSONB;

-- AlterTable
ALTER TABLE "xp_transactions" ADD COLUMN     "referenceKey" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "xp_transactions_referenceKey_key" ON "xp_transactions"("referenceKey");

