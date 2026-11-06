-- AlterEnum
ALTER TYPE "InvitationStatus" ADD VALUE 'DECLINED';

-- AlterTable
ALTER TABLE "team_invitations" ADD COLUMN     "acceptedAt" TIMESTAMP(3),
ADD COLUMN     "invitedPlayerId" UUID,
ADD COLUMN     "revokedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "teams" ADD COLUMN     "avatarUrl" TEXT,
ADD COLUMN     "description" TEXT;

-- CreateIndex
CREATE INDEX "team_invitations_invitedPlayerId_idx" ON "team_invitations"("invitedPlayerId");

-- AddForeignKey
ALTER TABLE "team_invitations" ADD CONSTRAINT "team_invitations_invitedPlayerId_fkey" FOREIGN KEY ("invitedPlayerId") REFERENCES "player_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
