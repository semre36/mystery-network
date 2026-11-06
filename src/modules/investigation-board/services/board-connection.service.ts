import { prisma } from "@/server/infrastructure/database";
import { AppError } from "@/lib/errors/app-error";
import { BoardGuard } from "../guards/board.guard";
import {
  CreateBoardConnectionInput,
  UpdateBoardConnectionInput,
  SafeBoardConnectionDto,
  BoardRelationshipType,
} from "../types/board.types";
import { logger } from "@/lib/logger";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export class BoardConnectionService {
  /**
   * Connects two pins/nodes on the board with a typed relationship.
   * Prevents self-connections and cross-board invalid edges.
   */
  public static async createConnection(
    userId: string,
    investigationId: string,
    input: CreateBoardConnectionInput
  ): Promise<SafeBoardConnectionDto> {
    const trimmedSource = (input.sourceNodeId || "").trim();
    const trimmedTarget = (input.targetNodeId || "").trim();

    if (!UUID_REGEX.test(trimmedSource) || !UUID_REGEX.test(trimmedTarget)) {
      throw new AppError("Invalid node identifier", 400, "INVALID_NODE_ID");
    }

    if (trimmedSource === trimmedTarget) {
      throw new AppError(
        "A board pin cannot be connected to itself.",
        400,
        "SELF_CONNECTION_FORBIDDEN"
      );
    }

    const { investigation, playerId, playerProfile } = await BoardGuard.verifyBoardAccess(
      userId,
      investigationId
    );

    // Verify both nodes exist and belong to this investigation's board
    const [sourceNode, targetNode] = await Promise.all([
      prisma.boardNode.findUnique({
        where: { id: trimmedSource },
        include: { board: { select: { id: true, investigationId: true } } },
      }),
      prisma.boardNode.findUnique({
        where: { id: trimmedTarget },
        include: { board: { select: { id: true, investigationId: true } } },
      }),
    ]);

    if (!sourceNode || sourceNode.board.investigationId !== investigation.id) {
      throw new AppError("Source node not found on this board", 404, "SOURCE_NODE_NOT_FOUND");
    }

    if (!targetNode || targetNode.board.investigationId !== investigation.id) {
      throw new AppError("Target node not found on this board", 404, "TARGET_NODE_NOT_FOUND");
    }

    const boardId = sourceNode.board.id;
    const relType = input.relationshipType ?? BoardRelationshipType.RELATED_TO;

    const connection = await prisma.boardConnection.upsert({
      where: {
        boardId_sourceNodeId_targetNodeId_relationshipType: {
          boardId,
          sourceNodeId: trimmedSource,
          targetNodeId: trimmedTarget,
          relationshipType: relType,
        },
      },
      update: {
        label: input.label ?? null,
        description: input.description ?? null,
      },
      create: {
        boardId,
        sourceNodeId: trimmedSource,
        targetNodeId: trimmedTarget,
        relationshipType: relType,
        label: input.label ?? null,
        description: input.description ?? null,
        createdByPlayerId: playerId,
      },
    });

    logger.info("Created board connection between nodes", {
      connectionId: connection.id,
      boardId,
      sourceNodeId: trimmedSource,
      targetNodeId: trimmedTarget,
      relationshipType: relType,
    });

    return {
      id: connection.id,
      boardId: connection.boardId,
      sourceNodeId: connection.sourceNodeId,
      targetNodeId: connection.targetNodeId,
      relationshipType: connection.relationshipType,
      label: connection.label,
      description: connection.description,
      createdByPlayerId: connection.createdByPlayerId,
      createdByCodename: playerProfile.codename,
      createdAt: connection.createdAt.toISOString(),
      updatedAt: connection.updatedAt.toISOString(),
    };
  }

  /**
   * Updates label, description, or relationship type for a connection.
   */
  public static async updateConnection(
    userId: string,
    investigationId: string,
    connectionId: string,
    input: UpdateBoardConnectionInput
  ): Promise<SafeBoardConnectionDto> {
    const trimmedConnId = (connectionId || "").trim();
    if (!UUID_REGEX.test(trimmedConnId)) {
      throw new AppError("Invalid connection identifier", 400, "INVALID_CONNECTION_ID");
    }

    const { investigation, playerProfile } = await BoardGuard.verifyBoardAccess(
      userId,
      investigationId
    );

    const existing = await prisma.boardConnection.findUnique({
      where: { id: trimmedConnId },
      include: {
        board: { select: { investigationId: true } },
      },
    });

    if (!existing || existing.board.investigationId !== investigation.id) {
      throw new AppError("Connection not found or restricted", 404, "CONNECTION_NOT_FOUND");
    }

    const updated = await prisma.boardConnection.update({
      where: { id: trimmedConnId },
      data: {
        ...(input.relationshipType ? { relationshipType: input.relationshipType } : {}),
        ...(input.label !== undefined ? { label: input.label } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
      },
    });

    return {
      id: updated.id,
      boardId: updated.boardId,
      sourceNodeId: updated.sourceNodeId,
      targetNodeId: updated.targetNodeId,
      relationshipType: updated.relationshipType,
      label: updated.label,
      description: updated.description,
      createdByPlayerId: updated.createdByPlayerId,
      createdByCodename: playerProfile.codename,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  }

  /**
   * Deletes a relationship connection from the board.
   */
  public static async deleteConnection(
    userId: string,
    investigationId: string,
    connectionId: string
  ): Promise<void> {
    const trimmedConnId = (connectionId || "").trim();
    if (!UUID_REGEX.test(trimmedConnId)) {
      throw new AppError("Invalid connection identifier", 400, "INVALID_CONNECTION_ID");
    }

    const { investigation } = await BoardGuard.verifyBoardAccess(userId, investigationId);

    const existing = await prisma.boardConnection.findUnique({
      where: { id: trimmedConnId },
      include: {
        board: { select: { investigationId: true } },
      },
    });

    if (!existing || existing.board.investigationId !== investigation.id) {
      throw new AppError("Connection not found or restricted", 404, "CONNECTION_NOT_FOUND");
    }

    await prisma.boardConnection.delete({
      where: { id: trimmedConnId },
    });

    logger.info("Deleted board connection", {
      connectionId: trimmedConnId,
      investigationId: investigation.id,
    });
  }
}
