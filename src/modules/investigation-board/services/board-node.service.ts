import { prisma } from "@/server/infrastructure/database";
import { AppError } from "@/lib/errors/app-error";
import { BoardGuard } from "../guards/board.guard";
import {
  CreateBoardNodeInput,
  UpdateBoardNodeInput,
  SafeBoardNodeDto,
  BoardNodeType,
} from "../types/board.types";
import { logger } from "@/lib/logger";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export class BoardNodeService {
  /**
   * Creates a pin/node on the investigation board with entity validation.
   */
  public static async createNode(
    userId: string,
    investigationId: string,
    input: CreateBoardNodeInput
  ): Promise<SafeBoardNodeDto> {
    const { investigation, playerId, playerProfile } = await BoardGuard.verifyBoardAccess(
      userId,
      investigationId
    );

    // 1. Resolve board
    let board = await prisma.investigationBoard.findUnique({
      where: { investigationId: investigation.id },
      select: { id: true },
    });

    if (!board) {
      board = await prisma.investigationBoard.create({
        data: {
          investigationId: investigation.id,
          title: `Crime Board: ${investigation.case?.title ?? "Case"}`,
        },
        select: { id: true },
      });
    }

    let resolvedTitle = input.title;
    let resolvedDescription = input.description ?? null;
    let entityPreview = null;

    // 2. Validate referenced entity authorization
    if (input.nodeType === BoardNodeType.EVIDENCE) {
      if (!input.referencedEntityId) {
        throw new AppError(
          "Evidence nodes must reference a valid evidence item",
          400,
          "MISSING_ENTITY_REFERENCE"
        );
      }

      const clue = await BoardGuard.verifyEvidenceAccessForBoard(
        userId,
        investigation.id,
        input.referencedEntityId
      );

      if (!resolvedTitle || resolvedTitle === "New Evidence") {
        resolvedTitle = clue.title;
      }
      if (!resolvedDescription) {
        resolvedDescription = clue.description.slice(0, 150);
      }

      entityPreview = {
        id: clue.id,
        type: "CLUE" as const,
        code: clue.clueCode,
        title: clue.title,
        snippet: clue.description.slice(0, 100),
        clueType: clue.clueType,
      };
    } else if (input.nodeType === BoardNodeType.CHARACTER) {
      if (!input.referencedEntityId) {
        throw new AppError(
          "Character nodes must reference a valid character dossier",
          400,
          "MISSING_ENTITY_REFERENCE"
        );
      }

      const char = await BoardGuard.verifyCharacterAccessForBoard(
        investigation.caseId ?? investigation.case?.id,
        input.referencedEntityId
      );

      if (!resolvedTitle || resolvedTitle === "New Person of Interest") {
        resolvedTitle = char.name;
      }
      if (!resolvedDescription) {
        resolvedDescription = char.description.slice(0, 150);
      }

      const meta = (char.metadata as any) ?? {};
      entityPreview = {
        id: char.id,
        type: "CHARACTER" as const,
        title: char.name,
        snippet: char.description.slice(0, 100),
        role: meta.role ?? null,
      };
    }

    // 3. Create node
    const node = await prisma.boardNode.create({
      data: {
        boardId: board.id,
        nodeType: input.nodeType,
        referencedEntityId: input.referencedEntityId ?? null,
        title: resolvedTitle,
        description: resolvedDescription,
        positionX: input.positionX,
        positionY: input.positionY,
        width: input.width ?? 240,
        height: input.height ?? null,
        color: input.color ?? null,
        metadata: input.metadata ?? {},
        createdByPlayerId: playerId,
      },
    });

    logger.info("Board node pinned to investigation board", {
      nodeId: node.id,
      boardId: board.id,
      nodeType: node.nodeType,
      playerId,
    });

    return {
      id: node.id,
      boardId: node.boardId,
      nodeType: node.nodeType,
      referencedEntityId: node.referencedEntityId,
      title: node.title,
      description: node.description,
      positionX: node.positionX,
      positionY: node.positionY,
      width: node.width ?? 240,
      height: node.height,
      color: node.color,
      metadata: (node.metadata as Record<string, any>) ?? {},
      createdByPlayerId: node.createdByPlayerId,
      createdByCodename: playerProfile.codename,
      createdAt: node.createdAt.toISOString(),
      updatedAt: node.updatedAt.toISOString(),
      entityPreview,
    };
  }

  /**
   * Updates coordinates, dimensions, title, or styling for a board node.
   */
  public static async updateNode(
    userId: string,
    investigationId: string,
    nodeId: string,
    input: UpdateBoardNodeInput
  ): Promise<SafeBoardNodeDto> {
    const trimmedNodeId = (nodeId || "").trim();
    if (!UUID_REGEX.test(trimmedNodeId)) {
      throw new AppError("Invalid node identifier", 400, "INVALID_NODE_ID");
    }

    const { investigation, playerProfile } = await BoardGuard.verifyBoardAccess(
      userId,
      investigationId
    );

    const existingNode = await prisma.boardNode.findUnique({
      where: { id: trimmedNodeId },
      include: {
        board: {
          select: { investigationId: true },
        },
      },
    });

    if (!existingNode || existingNode.board.investigationId !== investigation.id) {
      throw new AppError("Board node not found or restricted", 404, "NODE_NOT_FOUND");
    }

    const updated = await prisma.boardNode.update({
      where: { id: trimmedNodeId },
      data: {
        ...(typeof input.title === "string" ? { title: input.title } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(typeof input.positionX === "number" ? { positionX: input.positionX } : {}),
        ...(typeof input.positionY === "number" ? { positionY: input.positionY } : {}),
        ...(typeof input.width === "number" ? { width: input.width } : {}),
        ...(input.height !== undefined ? { height: input.height } : {}),
        ...(input.color !== undefined ? { color: input.color } : {}),
        ...(input.metadata !== undefined ? { metadata: input.metadata } : {}),
      },
    });

    return {
      id: updated.id,
      boardId: updated.boardId,
      nodeType: updated.nodeType,
      referencedEntityId: updated.referencedEntityId,
      title: updated.title,
      description: updated.description,
      positionX: updated.positionX,
      positionY: updated.positionY,
      width: updated.width ?? 240,
      height: updated.height,
      color: updated.color,
      metadata: (updated.metadata as Record<string, any>) ?? {},
      createdByPlayerId: updated.createdByPlayerId,
      createdByCodename: playerProfile.codename,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  }

  /**
   * Deletes a node from the board. Cascades to clean up connections.
   * Never deletes the underlying referenced evidence or character.
   */
  public static async deleteNode(
    userId: string,
    investigationId: string,
    nodeId: string
  ): Promise<void> {
    const trimmedNodeId = (nodeId || "").trim();
    if (!UUID_REGEX.test(trimmedNodeId)) {
      throw new AppError("Invalid node identifier", 400, "INVALID_NODE_ID");
    }

    const { investigation } = await BoardGuard.verifyBoardAccess(userId, investigationId);

    const existingNode = await prisma.boardNode.findUnique({
      where: { id: trimmedNodeId },
      include: {
        board: {
          select: { investigationId: true },
        },
      },
    });

    if (!existingNode || existingNode.board.investigationId !== investigation.id) {
      throw new AppError("Board node not found or restricted", 404, "NODE_NOT_FOUND");
    }

    await prisma.boardNode.delete({
      where: { id: trimmedNodeId },
    });

    logger.info("Deleted board node", {
      nodeId: trimmedNodeId,
      investigationId: investigation.id,
    });
  }
}

