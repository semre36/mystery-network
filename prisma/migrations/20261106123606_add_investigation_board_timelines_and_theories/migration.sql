-- CreateEnum
CREATE TYPE "BoardNodeType" AS ENUM ('EVIDENCE', 'CHARACTER', 'LOCATION', 'EVENT', 'NOTE', 'THEORY');

-- CreateEnum
CREATE TYPE "BoardRelationshipType" AS ENUM ('RELATED_TO', 'SUPPORTS', 'CONTRADICTS', 'CONNECTED_TO', 'SUSPECTED_OF', 'PRESENT_AT', 'COMMUNICATED_WITH', 'CUSTOM');

-- CreateEnum
CREATE TYPE "TimePrecision" AS ENUM ('EXACT', 'APPROXIMATE', 'DATE_ONLY', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "TheoryStatus" AS ENUM ('DRAFT', 'ACTIVE', 'SUPPORTED', 'CHALLENGED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "TheoryEvidenceRelationship" AS ENUM ('SUPPORTS', 'CONTRADICTS', 'NEUTRAL');

-- CreateTable
CREATE TABLE "investigation_boards" (
    "id" UUID NOT NULL,
    "investigationId" UUID NOT NULL,
    "title" TEXT NOT NULL DEFAULT 'Operational Crime Board',
    "description" TEXT,
    "viewport" JSONB DEFAULT '{"zoom": 1, "panX": 0, "panY": 0}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "investigation_boards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "board_nodes" (
    "id" UUID NOT NULL,
    "boardId" UUID NOT NULL,
    "nodeType" "BoardNodeType" NOT NULL,
    "referencedEntityId" UUID,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "positionX" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "positionY" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "width" DOUBLE PRECISION DEFAULT 240,
    "height" DOUBLE PRECISION,
    "color" TEXT,
    "metadata" JSONB DEFAULT '{}',
    "createdByPlayerId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "board_nodes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "board_connections" (
    "id" UUID NOT NULL,
    "boardId" UUID NOT NULL,
    "sourceNodeId" UUID NOT NULL,
    "targetNodeId" UUID NOT NULL,
    "relationshipType" "BoardRelationshipType" NOT NULL DEFAULT 'RELATED_TO',
    "label" TEXT,
    "description" TEXT,
    "createdByPlayerId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "board_connections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "investigation_timeline_events" (
    "id" UUID NOT NULL,
    "investigationId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "eventTime" TIMESTAMP(3),
    "timePrecision" "TimePrecision" NOT NULL DEFAULT 'EXACT',
    "rawTimeLabel" TEXT,
    "metadata" JSONB DEFAULT '{}',
    "createdByPlayerId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "investigation_timeline_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "investigation_theories" (
    "id" UUID NOT NULL,
    "investigationId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "TheoryStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdByPlayerId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "investigation_theories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "theory_evidence" (
    "id" UUID NOT NULL,
    "theoryId" UUID NOT NULL,
    "clueId" UUID NOT NULL,
    "relationship" "TheoryEvidenceRelationship" NOT NULL DEFAULT 'SUPPORTS',
    "explanation" TEXT,
    "createdByPlayerId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "theory_evidence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "investigation_boards_investigationId_key" ON "investigation_boards"("investigationId");

-- CreateIndex
CREATE INDEX "investigation_boards_investigationId_idx" ON "investigation_boards"("investigationId");

-- CreateIndex
CREATE INDEX "board_nodes_boardId_idx" ON "board_nodes"("boardId");

-- CreateIndex
CREATE INDEX "board_nodes_nodeType_idx" ON "board_nodes"("nodeType");

-- CreateIndex
CREATE INDEX "board_nodes_referencedEntityId_idx" ON "board_nodes"("referencedEntityId");

-- CreateIndex
CREATE INDEX "board_nodes_createdByPlayerId_idx" ON "board_nodes"("createdByPlayerId");

-- CreateIndex
CREATE INDEX "board_connections_boardId_idx" ON "board_connections"("boardId");

-- CreateIndex
CREATE INDEX "board_connections_sourceNodeId_idx" ON "board_connections"("sourceNodeId");

-- CreateIndex
CREATE INDEX "board_connections_targetNodeId_idx" ON "board_connections"("targetNodeId");

-- CreateIndex
CREATE INDEX "board_connections_relationshipType_idx" ON "board_connections"("relationshipType");

-- CreateIndex
CREATE INDEX "board_connections_createdByPlayerId_idx" ON "board_connections"("createdByPlayerId");

-- CreateIndex
CREATE UNIQUE INDEX "board_connections_boardId_sourceNodeId_targetNodeId_relatio_key" ON "board_connections"("boardId", "sourceNodeId", "targetNodeId", "relationshipType");

-- CreateIndex
CREATE INDEX "investigation_timeline_events_investigationId_idx" ON "investigation_timeline_events"("investigationId");

-- CreateIndex
CREATE INDEX "investigation_timeline_events_eventTime_idx" ON "investigation_timeline_events"("eventTime");

-- CreateIndex
CREATE INDEX "investigation_timeline_events_createdByPlayerId_idx" ON "investigation_timeline_events"("createdByPlayerId");

-- CreateIndex
CREATE INDEX "investigation_theories_investigationId_idx" ON "investigation_theories"("investigationId");

-- CreateIndex
CREATE INDEX "investigation_theories_status_idx" ON "investigation_theories"("status");

-- CreateIndex
CREATE INDEX "investigation_theories_createdByPlayerId_idx" ON "investigation_theories"("createdByPlayerId");

-- CreateIndex
CREATE INDEX "theory_evidence_theoryId_idx" ON "theory_evidence"("theoryId");

-- CreateIndex
CREATE INDEX "theory_evidence_clueId_idx" ON "theory_evidence"("clueId");

-- CreateIndex
CREATE INDEX "theory_evidence_relationship_idx" ON "theory_evidence"("relationship");

-- CreateIndex
CREATE INDEX "theory_evidence_createdByPlayerId_idx" ON "theory_evidence"("createdByPlayerId");

-- CreateIndex
CREATE UNIQUE INDEX "theory_evidence_theoryId_clueId_key" ON "theory_evidence"("theoryId", "clueId");

-- AddForeignKey
ALTER TABLE "investigation_boards" ADD CONSTRAINT "investigation_boards_investigationId_fkey" FOREIGN KEY ("investigationId") REFERENCES "investigations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "board_nodes" ADD CONSTRAINT "board_nodes_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "investigation_boards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "board_nodes" ADD CONSTRAINT "board_nodes_createdByPlayerId_fkey" FOREIGN KEY ("createdByPlayerId") REFERENCES "player_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "board_connections" ADD CONSTRAINT "board_connections_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "investigation_boards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "board_connections" ADD CONSTRAINT "board_connections_sourceNodeId_fkey" FOREIGN KEY ("sourceNodeId") REFERENCES "board_nodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "board_connections" ADD CONSTRAINT "board_connections_targetNodeId_fkey" FOREIGN KEY ("targetNodeId") REFERENCES "board_nodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "board_connections" ADD CONSTRAINT "board_connections_createdByPlayerId_fkey" FOREIGN KEY ("createdByPlayerId") REFERENCES "player_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "investigation_timeline_events" ADD CONSTRAINT "investigation_timeline_events_investigationId_fkey" FOREIGN KEY ("investigationId") REFERENCES "investigations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "investigation_timeline_events" ADD CONSTRAINT "investigation_timeline_events_createdByPlayerId_fkey" FOREIGN KEY ("createdByPlayerId") REFERENCES "player_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "investigation_theories" ADD CONSTRAINT "investigation_theories_investigationId_fkey" FOREIGN KEY ("investigationId") REFERENCES "investigations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "investigation_theories" ADD CONSTRAINT "investigation_theories_createdByPlayerId_fkey" FOREIGN KEY ("createdByPlayerId") REFERENCES "player_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "theory_evidence" ADD CONSTRAINT "theory_evidence_theoryId_fkey" FOREIGN KEY ("theoryId") REFERENCES "investigation_theories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "theory_evidence" ADD CONSTRAINT "theory_evidence_clueId_fkey" FOREIGN KEY ("clueId") REFERENCES "clues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "theory_evidence" ADD CONSTRAINT "theory_evidence_createdByPlayerId_fkey" FOREIGN KEY ("createdByPlayerId") REFERENCES "player_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
