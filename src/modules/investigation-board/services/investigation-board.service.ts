import { prisma } from "@/server/infrastructure/database";
import { BoardGuard } from "../guards/board.guard";
import {
  SafeInvestigationBoardDto,
  SafeBoardNodeDto,
  SafeBoardConnectionDto,
  SafeBoardViewportDto,
  BoardNodeType,
} from "../types/board.types";
import { logger } from "@/lib/logger";

export class InvestigationBoardService {
  /**
   * Retrieves or initializes the persistent investigation board for the session.
   * Hydrates nodes and connections with creator codenames and safe entity previews.
   */
  public static async getOrCreateBoard(
    userId: string,
    investigationId: string
  ): Promise<SafeInvestigationBoardDto> {
    const { investigation } = await BoardGuard.verifyBoardAccess(userId, investigationId, {
      allowReadOnlyIfConcluded: true,
    });

    let board = await prisma.investigationBoard.findUnique({
      where: { investigationId: investigation.id },
      include: {
        nodes: {
          include: {
            createdBy: {
              select: { codename: true },
            },
          },
          orderBy: { createdAt: "asc" },
        },
        connections: {
          include: {
            createdBy: {
              select: { codename: true },
            },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!board) {
      board = await prisma.investigationBoard.create({
        data: {
          investigationId: investigation.id,
          title: `Crime Board: ${investigation.case?.title ?? "Case"}`,
          viewport: { zoom: 1, panX: 0, panY: 0 },
        },
        include: {
          nodes: {
            include: {
              createdBy: {
                select: { codename: true },
              },
            },
          },
          connections: {
            include: {
              createdBy: {
                select: { codename: true },
              },
            },
          },
        },
      });

      logger.info("Initialized new investigation crime board", {
        boardId: board.id,
        investigationId: investigation.id,
      });
    }

    // Hydrate safe node representations
    const safeNodes: SafeBoardNodeDto[] = [];

    for (const node of board.nodes) {
      let entityPreview = null;

      if (node.nodeType === BoardNodeType.EVIDENCE && node.referencedEntityId) {
        try {
          const clue = await BoardGuard.verifyEvidenceAccessForBoard(
            userId,
            investigation.id,
            node.referencedEntityId
          );
          entityPreview = {
            id: clue.id,
            type: "CLUE" as const,
            code: clue.clueCode,
            title: clue.title,
            snippet: clue.description.slice(0, 100),
            clueType: clue.clueType,
          };
        } catch {
          // If revoked or unassigned exclusive, provide a restricted placeholder
          entityPreview = {
            id: node.referencedEntityId,
            type: "CLUE" as const,
            title: "[Restricted Intelligence / Revoked Access]",
          };
        }
      } else if (node.nodeType === BoardNodeType.CHARACTER && node.referencedEntityId) {
        try {
          const char = await BoardGuard.verifyCharacterAccessForBoard(
            investigation.caseId ?? investigation.case?.id,
            node.referencedEntityId
          );
          const meta = (char.metadata as any) ?? {};
          entityPreview = {
            id: char.id,
            type: "CHARACTER" as const,
            title: char.name,
            snippet: char.description.slice(0, 100),
            role: meta.role ?? null,
          };
        } catch {
          entityPreview = {
            id: node.referencedEntityId,
            type: "CHARACTER" as const,
            title: "[Unknown Dossier]",
          };
        }
      }

      safeNodes.push({
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
        createdByCodename: node.createdBy.codename,
        createdAt: node.createdAt.toISOString(),
        updatedAt: node.updatedAt.toISOString(),
        entityPreview,
      });
    }

    const safeConnections: SafeBoardConnectionDto[] = board.connections.map((c) => ({
      id: c.id,
      boardId: c.boardId,
      sourceNodeId: c.sourceNodeId,
      targetNodeId: c.targetNodeId,
      relationshipType: c.relationshipType,
      label: c.label,
      description: c.description,
      createdByPlayerId: c.createdByPlayerId,
      createdByCodename: c.createdBy.codename,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    }));

    const rawViewport = (board.viewport as any) ?? {};
    const safeViewport: SafeBoardViewportDto = {
      zoom: typeof rawViewport.zoom === "number" ? rawViewport.zoom : 1,
      panX: typeof rawViewport.panX === "number" ? rawViewport.panX : 0,
      panY: typeof rawViewport.panY === "number" ? rawViewport.panY : 0,
    };

    return {
      id: board.id,
      investigationId: board.investigationId,
      title: board.title,
      description: board.description,
      viewport: safeViewport,
      nodes: safeNodes,
      connections: safeConnections,
      createdAt: (board.createdAt ? new Date(board.createdAt) : new Date()).toISOString(),
      updatedAt: (board.updatedAt ? new Date(board.updatedAt) : new Date()).toISOString(),
    };
  }

  /**
   * Updates the shared board viewport (pan coordinates and zoom level).
   */
  public static async updateViewport(
    userId: string,
    investigationId: string,
    viewport: SafeBoardViewportDto
  ): Promise<SafeBoardViewportDto> {
    await BoardGuard.verifyBoardAccess(userId, investigationId);

    const updated = await prisma.investigationBoard.update({
      where: { investigationId },
      data: {
        viewport: {
          zoom: viewport.zoom,
          panX: viewport.panX,
          panY: viewport.panY,
        },
      },
      select: { viewport: true },
    });

    return updated.viewport as any as SafeBoardViewportDto;
  }
}
