import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { InvestigationBoardService } from "@/modules/investigation-board/services/investigation-board.service";
import { BoardNodeService } from "@/modules/investigation-board/services/board-node.service";
import { BoardConnectionService } from "@/modules/investigation-board/services/board-connection.service";
import { TimelineService } from "@/modules/investigation-board/services/timeline.service";
import { TheoryService } from "@/modules/investigation-board/services/theory.service";
import { BoardGuard } from "@/modules/investigation-board/guards/board.guard";
import { EvidenceService } from "@/modules/evidence/services/evidence.service";
import {
  BoardNodeType,
  BoardRelationshipType,
  TimePrecision,
  TheoryStatus,
  TheoryEvidenceRelationship,
} from "@/modules/investigation-board/types/board.types";
import {
  GET as getBoardRoute,
  PATCH as updateBoardRoute,
} from "@/app/api/investigations/[investigationId]/board/route";
import { POST as createNodeRoute } from "@/app/api/investigations/[investigationId]/board/nodes/route";
import { POST as createConnectionRoute } from "@/app/api/investigations/[investigationId]/board/connections/route";
import {
  GET as getTimelineRoute,
  POST as createTimelineRoute,
} from "@/app/api/investigations/[investigationId]/timeline/route";
import {
  GET as getTheoriesRoute,
  POST as createTheoryRoute,
} from "@/app/api/investigations/[investigationId]/theories/route";
import * as authGuard from "@/modules/authentication/guards/auth.guard";
import { prisma } from "@/server/infrastructure/database";
import {
  ParticipantStatus,
  MembershipStatus,
  TeamStatus,
  InvestigationStatus,
} from "@prisma/client";
import { NextRequest } from "next/server";

describe("Investigation Board, Evidence Relationships, Timelines & Theories (Phase 11)", () => {
  const MOCK_USER_ID = "00000000-0000-4000-a000-000000000001";
  const MOCK_OTHER_USER_ID = "00000000-0000-4000-a000-000000000002";
  const MOCK_PROFILE_ID = "00000000-0000-4000-a000-000000000003";
  const MOCK_CASE_ID = "00000000-0000-4000-a000-000000000005";
  const MOCK_INVESTIGATION_ID = "00000000-0000-4000-a000-000000000008";
  const MOCK_BOARD_ID = "00000000-0000-4000-a000-0000000000b0";
  const MOCK_NODE_ID_1 = "00000000-0000-4000-a000-0000000000b1";
  const MOCK_NODE_ID_2 = "00000000-0000-4000-a000-0000000000b2";
  const MOCK_CONNECTION_ID = "00000000-0000-4000-a000-0000000000b3";
  const MOCK_CLUE_ID = "00000000-0000-4000-a000-0000000000c1";
  const MOCK_CHARACTER_ID = "00000000-0000-4000-a000-0000000000d1";
  const MOCK_THEORY_ID = "00000000-0000-4000-a000-0000000000e1";
  const MOCK_TIMELINE_ID = "00000000-0000-4000-a000-0000000000f1";

  const mockAuthenticatedUser = {
    id: MOCK_USER_ID,
    telegramId: "123456789",
  };

  const createMockInvestigation = (overrides: Record<string, any> = {}) => ({
    id: MOCK_INVESTIGATION_ID,
    caseId: MOCK_CASE_ID,
    status: InvestigationStatus.IN_PROGRESS,
    case: {
      id: MOCK_CASE_ID,
      caseCode: "CASE-001-MIDNIGHT-PROTOCOL",
      title: "The Midnight Protocol",
    },
    participants: [
      {
        id: "participant-1",
        playerId: MOCK_PROFILE_ID,
        status: ParticipantStatus.ACTIVE,
      },
    ],
    team: null,
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(authGuard, "getCurrentUser").mockResolvedValue(mockAuthenticatedUser as any);
    vi.spyOn(authGuard, "requireAuthenticatedUser").mockResolvedValue(mockAuthenticatedUser as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ==========================================================================
  // SECTION 1: Authorization & BoardGuard
  // ==========================================================================
  describe("BoardGuard Access Control", () => {
    it("rejects unauthenticated requests or missing investigator profile", async () => {
      vi.spyOn(prisma.playerProfile, "findUnique").mockResolvedValue(null);

      await expect(
        BoardGuard.verifyBoardAccess(MOCK_USER_ID, MOCK_INVESTIGATION_ID)
      ).rejects.toThrow("Active investigator profile required");
    });

    it("rejects an operative who is not an active participant with 404", async () => {
      vi.spyOn(prisma.playerProfile, "findUnique").mockResolvedValue({
        id: MOCK_PROFILE_ID,
        codename: "AGENT_CIPHER",
        displayName: "Cipher",
      } as any);

      vi.spyOn(prisma.investigation, "findUnique").mockResolvedValue({
        id: MOCK_INVESTIGATION_ID,
        caseId: MOCK_CASE_ID,
        participants: [], // No active participant for this operative
      } as any);

      await expect(
        BoardGuard.verifyBoardAccess(MOCK_USER_ID, MOCK_INVESTIGATION_ID)
      ).rejects.toThrow("Investigation session not found or restricted");
    });

    it("rejects operative when squad is disbanded", async () => {
      vi.spyOn(prisma.playerProfile, "findUnique").mockResolvedValue({
        id: MOCK_PROFILE_ID,
        codename: "AGENT_CIPHER",
        displayName: "Cipher",
      } as any);

      const inv = createMockInvestigation({ teamId: "team-disbanded-1" });
      vi.spyOn(prisma.investigation, "findUnique").mockResolvedValue(inv as any);

      vi.spyOn(prisma.team, "findUnique").mockResolvedValue({
        id: "team-disbanded-1",
        status: TeamStatus.DISBANDED,
      } as any);

      await expect(
        BoardGuard.verifyBoardAccess(MOCK_USER_ID, MOCK_INVESTIGATION_ID)
      ).rejects.toThrow("Investigation session not found or restricted");
    });

    it("rejects operative removed from squad membership", async () => {
      vi.spyOn(prisma.playerProfile, "findUnique").mockResolvedValue({
        id: MOCK_PROFILE_ID,
        codename: "AGENT_CIPHER",
        displayName: "Cipher",
      } as any);

      const inv = createMockInvestigation({ teamId: "team-1" });
      vi.spyOn(prisma.investigation, "findUnique").mockResolvedValue(inv as any);

      vi.spyOn(prisma.team, "findUnique").mockResolvedValue({
        id: "team-1",
        status: TeamStatus.ACTIVE,
      } as any);

      vi.spyOn(prisma.teamMembership, "findUnique").mockResolvedValue({
        status: MembershipStatus.REMOVED,
      } as any);

      await expect(
        BoardGuard.verifyBoardAccess(MOCK_USER_ID, MOCK_INVESTIGATION_ID)
      ).rejects.toThrow("Investigation session not found or restricted");
    });

    it("locks mutations when investigation session has concluded", async () => {
      vi.spyOn(prisma.playerProfile, "findUnique").mockResolvedValue({
        id: MOCK_PROFILE_ID,
        codename: "AGENT_CIPHER",
        displayName: "Cipher",
      } as any);

      const solvedInv = createMockInvestigation({ status: InvestigationStatus.SOLVED });
      vi.spyOn(prisma.investigation, "findUnique").mockResolvedValue(solvedInv as any);

      await expect(
        BoardGuard.verifyBoardAccess(MOCK_USER_ID, MOCK_INVESTIGATION_ID)
      ).rejects.toThrow("Investigation session has concluded. Board modifications are locked.");
    });
  });

  // ==========================================================================
  // SECTION 2: Evidence Integration & Verification
  // ==========================================================================
  describe("Evidence Integration on Crime Board", () => {
    it("allows adding assigned evidence to board via EvidenceService verification", async () => {
      vi.spyOn(BoardGuard, "verifyBoardAccess").mockResolvedValue({
        investigation: createMockInvestigation(),
        playerId: MOCK_PROFILE_ID,
        playerProfile: { id: MOCK_PROFILE_ID, codename: "CIPHER", displayName: "Cipher" },
      });

      vi.spyOn(EvidenceService, "getEvidenceDetail").mockResolvedValue({
        id: MOCK_CLUE_ID,
        title: "Encrypted Network Log",
        clueCode: "LOG-01",
        description: "Packet capture containing suspicious beaconing.",
        clueType: "FORENSIC" as any,
      } as any);

      vi.spyOn(prisma.investigationBoard, "findUnique").mockResolvedValue({
        id: MOCK_BOARD_ID,
      } as any);

      vi.spyOn(prisma.boardNode, "create").mockResolvedValue({
        id: MOCK_NODE_ID_1,
        boardId: MOCK_BOARD_ID,
        nodeType: BoardNodeType.EVIDENCE,
        referencedEntityId: MOCK_CLUE_ID,
        title: "Encrypted Network Log",
        description: "Packet capture containing suspicious beaconing.",
        positionX: 100,
        positionY: 100,
        width: 240,
        height: null,
        color: null,
        metadata: {},
        createdByPlayerId: MOCK_PROFILE_ID,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const node = await BoardNodeService.createNode(MOCK_USER_ID, MOCK_INVESTIGATION_ID, {
        nodeType: BoardNodeType.EVIDENCE,
        referencedEntityId: MOCK_CLUE_ID,
        title: "Encrypted Network Log",
        positionX: 100,
        positionY: 100,
      });

      expect(node.nodeType).toBe(BoardNodeType.EVIDENCE);
      expect(node.entityPreview?.title).toBe("Encrypted Network Log");
      expect(node.entityPreview?.code).toBe("LOG-01");
    });

    it("rejects evidence node creation without referencedEntityId", async () => {
      vi.spyOn(BoardGuard, "verifyBoardAccess").mockResolvedValue({
        investigation: createMockInvestigation(),
        playerId: MOCK_PROFILE_ID,
        playerProfile: { id: MOCK_PROFILE_ID, codename: "CIPHER", displayName: "Cipher" },
      });

      vi.spyOn(prisma.investigationBoard, "findUnique").mockResolvedValue({
        id: MOCK_BOARD_ID,
      } as any);

      await expect(
        BoardNodeService.createNode(MOCK_USER_ID, MOCK_INVESTIGATION_ID, {
          nodeType: BoardNodeType.EVIDENCE,
          title: "Missing Reference",
          positionX: 100,
          positionY: 100,
        })
      ).rejects.toThrow("Evidence nodes must reference a valid evidence item");
    });

    it("safely handles revoked evidence during board loading without crashing", async () => {
      vi.spyOn(BoardGuard, "verifyBoardAccess").mockResolvedValue({
        investigation: createMockInvestigation(),
        playerId: MOCK_PROFILE_ID,
        playerProfile: { id: MOCK_PROFILE_ID, codename: "CIPHER", displayName: "Cipher" },
      });

      vi.spyOn(prisma.investigationBoard, "findUnique").mockResolvedValue({
        id: MOCK_BOARD_ID,
        investigationId: MOCK_INVESTIGATION_ID,
        title: "Crime Board",
        description: null,
        viewport: { zoom: 1, panX: 0, panY: 0 },
        createdAt: new Date(),
        updatedAt: new Date(),
        nodes: [
          {
            id: MOCK_NODE_ID_1,
            boardId: MOCK_BOARD_ID,
            nodeType: BoardNodeType.EVIDENCE,
            referencedEntityId: MOCK_CLUE_ID,
            title: "Old Clue",
            description: null,
            positionX: 100,
            positionY: 100,
            width: 240,
            height: null,
            color: null,
            metadata: {},
            createdByPlayerId: MOCK_PROFILE_ID,
            createdBy: { codename: "CIPHER" },
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
        connections: [],
      } as any);

      // Simulate evidence access revoked
      vi.spyOn(BoardGuard, "verifyEvidenceAccessForBoard").mockRejectedValue(
        new Error("Access revoked")
      );

      const board = await InvestigationBoardService.getOrCreateBoard(
        MOCK_USER_ID,
        MOCK_INVESTIGATION_ID
      );

      expect(board.nodes).toHaveLength(1);
      expect(board.nodes[0].entityPreview?.title).toBe(
        "[Restricted Intelligence / Revoked Access]"
      );
    });
  });

  // ==========================================================================
  // SECTION 3: Board Nodes (CRUD & Integrity)
  // ==========================================================================
  describe("BoardNode Management", () => {
    it("creates custom investigator note node with coordinates", async () => {
      vi.spyOn(BoardGuard, "verifyBoardAccess").mockResolvedValue({
        investigation: createMockInvestigation(),
        playerId: MOCK_PROFILE_ID,
        playerProfile: { id: MOCK_PROFILE_ID, codename: "CIPHER", displayName: "Cipher" },
      });

      vi.spyOn(prisma.investigationBoard, "findUnique").mockResolvedValue({
        id: MOCK_BOARD_ID,
      } as any);

      vi.spyOn(prisma.boardNode, "create").mockResolvedValue({
        id: MOCK_NODE_ID_2,
        boardId: MOCK_BOARD_ID,
        nodeType: BoardNodeType.NOTE,
        referencedEntityId: null,
        title: "Cipher Pattern Hypothesis",
        description: "Shift key matches Fibonacci sequence",
        positionX: 300,
        positionY: 450,
        width: 240,
        height: null,
        color: "#fef08a",
        metadata: {},
        createdByPlayerId: MOCK_PROFILE_ID,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const node = await BoardNodeService.createNode(MOCK_USER_ID, MOCK_INVESTIGATION_ID, {
        nodeType: BoardNodeType.NOTE,
        title: "Cipher Pattern Hypothesis",
        description: "Shift key matches Fibonacci sequence",
        positionX: 300,
        positionY: 450,
        color: "#fef08a",
      });

      expect(node.nodeType).toBe(BoardNodeType.NOTE);
      expect(node.positionX).toBe(300);
      expect(node.positionY).toBe(450);
      expect(node.color).toBe("#fef08a");
    });

    it("updates pin position and persists movement", async () => {
      vi.spyOn(BoardGuard, "verifyBoardAccess").mockResolvedValue({
        investigation: createMockInvestigation(),
        playerId: MOCK_PROFILE_ID,
        playerProfile: { id: MOCK_PROFILE_ID, codename: "CIPHER", displayName: "Cipher" },
      });

      vi.spyOn(prisma.boardNode, "findUnique").mockResolvedValue({
        id: MOCK_NODE_ID_1,
        board: { investigationId: MOCK_INVESTIGATION_ID },
      } as any);

      vi.spyOn(prisma.boardNode, "update").mockResolvedValue({
        id: MOCK_NODE_ID_1,
        boardId: MOCK_BOARD_ID,
        nodeType: BoardNodeType.NOTE,
        referencedEntityId: null,
        title: "Moved Note",
        description: null,
        positionX: 850,
        positionY: 620,
        width: 240,
        height: null,
        color: null,
        metadata: {},
        createdByPlayerId: MOCK_PROFILE_ID,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const updated = await BoardNodeService.updateNode(
        MOCK_USER_ID,
        MOCK_INVESTIGATION_ID,
        MOCK_NODE_ID_1,
        { positionX: 850, positionY: 620 }
      );

      expect(updated.positionX).toBe(850);
      expect(updated.positionY).toBe(620);
    });

    it("deletes node without deleting underlying case entities", async () => {
      vi.spyOn(BoardGuard, "verifyBoardAccess").mockResolvedValue({
        investigation: createMockInvestigation(),
        playerId: MOCK_PROFILE_ID,
        playerProfile: { id: MOCK_PROFILE_ID, codename: "CIPHER", displayName: "Cipher" },
      });

      vi.spyOn(prisma.boardNode, "findUnique").mockResolvedValue({
        id: MOCK_NODE_ID_1,
        board: { investigationId: MOCK_INVESTIGATION_ID },
      } as any);

      const deleteSpy = vi.spyOn(prisma.boardNode, "delete").mockResolvedValue({} as any);
      const clueDeleteSpy = vi.spyOn(prisma.clue, "delete");

      await BoardNodeService.deleteNode(MOCK_USER_ID, MOCK_INVESTIGATION_ID, MOCK_NODE_ID_1);

      expect(deleteSpy).toHaveBeenCalledWith({ where: { id: MOCK_NODE_ID_1 } });
      expect(clueDeleteSpy).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // SECTION 4: Board Connections (Strings & Relationships)
  // ==========================================================================
  describe("BoardConnection Management", () => {
    it("creates connection between two valid pins on the board", async () => {
      vi.spyOn(BoardGuard, "verifyBoardAccess").mockResolvedValue({
        investigation: createMockInvestigation(),
        playerId: MOCK_PROFILE_ID,
        playerProfile: { id: MOCK_PROFILE_ID, codename: "CIPHER", displayName: "Cipher" },
      });

      vi.spyOn(prisma.boardNode as any, "findUnique").mockImplementation(async ({ where }: any) => {
        if (where.id === MOCK_NODE_ID_1 || where.id === MOCK_NODE_ID_2) {
          return {
            id: where.id,
            board: { id: MOCK_BOARD_ID, investigationId: MOCK_INVESTIGATION_ID },
          } as any;
        }
        return null;
      });

      vi.spyOn(prisma.boardConnection, "upsert").mockResolvedValue({
        id: MOCK_CONNECTION_ID,
        boardId: MOCK_BOARD_ID,
        sourceNodeId: MOCK_NODE_ID_1,
        targetNodeId: MOCK_NODE_ID_2,
        relationshipType: BoardRelationshipType.SUSPECTED_OF,
        label: "Direct Motive",
        description: "Suspect financial transactions match breach timestamp",
        createdByPlayerId: MOCK_PROFILE_ID,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const conn = await BoardConnectionService.createConnection(
        MOCK_USER_ID,
        MOCK_INVESTIGATION_ID,
        {
          sourceNodeId: MOCK_NODE_ID_1,
          targetNodeId: MOCK_NODE_ID_2,
          relationshipType: BoardRelationshipType.SUSPECTED_OF,
          label: "Direct Motive",
        }
      );

      expect(conn.relationshipType).toBe(BoardRelationshipType.SUSPECTED_OF);
      expect(conn.label).toBe("Direct Motive");
    });

    it("rejects self-connection attempts with 400", async () => {
      await expect(
        BoardConnectionService.createConnection(MOCK_USER_ID, MOCK_INVESTIGATION_ID, {
          sourceNodeId: MOCK_NODE_ID_1,
          targetNodeId: MOCK_NODE_ID_1, // Same node
        })
      ).rejects.toThrow("A board pin cannot be connected to itself.");
    });

    it("rejects connections linking nodes across different boards", async () => {
      vi.spyOn(BoardGuard, "verifyBoardAccess").mockResolvedValue({
        investigation: createMockInvestigation(),
        playerId: MOCK_PROFILE_ID,
        playerProfile: { id: MOCK_PROFILE_ID, codename: "CIPHER", displayName: "Cipher" },
      });

      vi.spyOn(prisma.boardNode as any, "findUnique").mockImplementation(async ({ where }: any) => {
        if (where.id === MOCK_NODE_ID_1) {
          return {
            id: MOCK_NODE_ID_1,
            board: { id: MOCK_BOARD_ID, investigationId: MOCK_INVESTIGATION_ID },
          } as any;
        }
        if (where.id === MOCK_NODE_ID_2) {
          return {
            id: MOCK_NODE_ID_2,
            board: { id: "foreign-board", investigationId: "foreign-inv" },
          } as any;
        }
        return null;
      });

      await expect(
        BoardConnectionService.createConnection(MOCK_USER_ID, MOCK_INVESTIGATION_ID, {
          sourceNodeId: MOCK_NODE_ID_1,
          targetNodeId: MOCK_NODE_ID_2,
        })
      ).rejects.toThrow("Target node not found on this board");
    });
  });

  // ==========================================================================
  // SECTION 5: Investigation Timeline
  // ==========================================================================
  describe("Investigation Timeline System", () => {
    it("creates timeline events supporting approximate precision and timestamps", async () => {
      vi.spyOn(BoardGuard, "verifyBoardAccess").mockResolvedValue({
        investigation: createMockInvestigation(),
        playerId: MOCK_PROFILE_ID,
        playerProfile: { id: MOCK_PROFILE_ID, codename: "CIPHER", displayName: "Cipher" },
      });

      vi.spyOn(prisma.investigationTimelineEvent, "create").mockResolvedValue({
        id: MOCK_TIMELINE_ID,
        investigationId: MOCK_INVESTIGATION_ID,
        title: "Breach Alarm Triggered",
        description: "Physical door sensor tripped at East Vault",
        eventTime: new Date("2026-11-06T23:45:00Z"),
        timePrecision: TimePrecision.APPROXIMATE,
        rawTimeLabel: "Approx. 23:45 CET",
        metadata: {},
        createdByPlayerId: MOCK_PROFILE_ID,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const event = await TimelineService.createTimelineEvent(MOCK_USER_ID, MOCK_INVESTIGATION_ID, {
        title: "Breach Alarm Triggered",
        description: "Physical door sensor tripped at East Vault",
        eventTime: "2026-11-06T23:45:00Z",
        timePrecision: TimePrecision.APPROXIMATE,
        rawTimeLabel: "Approx. 23:45 CET",
      });

      expect(event.timePrecision).toBe(TimePrecision.APPROXIMATE);
      expect(event.rawTimeLabel).toBe("Approx. 23:45 CET");
    });

    it("sorts timeline events chronologically", async () => {
      vi.spyOn(BoardGuard, "verifyBoardAccess").mockResolvedValue({
        investigation: createMockInvestigation(),
        playerId: MOCK_PROFILE_ID,
        playerProfile: { id: MOCK_PROFILE_ID, codename: "CIPHER", displayName: "Cipher" },
      });

      const eventsMock = [
        {
          id: "event-1",
          investigationId: MOCK_INVESTIGATION_ID,
          title: "Early Event",
          description: "Desc",
          eventTime: new Date("2026-11-06T10:00:00Z"),
          timePrecision: TimePrecision.EXACT,
          rawTimeLabel: null,
          metadata: {},
          createdByPlayerId: MOCK_PROFILE_ID,
          createdBy: { codename: "CIPHER" },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "event-2",
          investigationId: MOCK_INVESTIGATION_ID,
          title: "Late Event",
          description: "Desc",
          eventTime: new Date("2026-11-06T18:00:00Z"),
          timePrecision: TimePrecision.EXACT,
          rawTimeLabel: null,
          metadata: {},
          createdByPlayerId: MOCK_PROFILE_ID,
          createdBy: { codename: "CIPHER" },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      vi.spyOn(prisma.investigationTimelineEvent, "findMany").mockResolvedValue(eventsMock as any);

      const timeline = await TimelineService.getTimelineEvents(MOCK_USER_ID, MOCK_INVESTIGATION_ID);

      expect(timeline).toHaveLength(2);
      expect(timeline[0].title).toBe("Early Event");
      expect(timeline[1].title).toBe("Late Event");
    });
  });

  // ==========================================================================
  // SECTION 6: Investigation Theories & Hypotheses
  // ==========================================================================
  describe("Theory System & Evidence Associations", () => {
    it("creates a hypothesis and associates supporting and contradicting clues", async () => {
      vi.spyOn(BoardGuard, "verifyBoardAccess").mockResolvedValue({
        investigation: createMockInvestigation(),
        playerId: MOCK_PROFILE_ID,
        playerProfile: { id: MOCK_PROFILE_ID, codename: "CIPHER", displayName: "Cipher" },
      });

      vi.spyOn(prisma.investigationTheory, "create").mockResolvedValue({
        id: MOCK_THEORY_ID,
        investigationId: MOCK_INVESTIGATION_ID,
        title: "Malicious Insider Infiltration",
        description: "A compromised developer account leaked RSA keys",
        status: TheoryStatus.ACTIVE,
        createdByPlayerId: MOCK_PROFILE_ID,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const theory = await TheoryService.createTheory(MOCK_USER_ID, MOCK_INVESTIGATION_ID, {
        title: "Malicious Insider Infiltration",
        description: "A compromised developer account leaked RSA keys",
      });

      expect(theory.status).toBe(TheoryStatus.ACTIVE);

      // Now associate supporting evidence
      vi.spyOn(prisma.investigationTheory, "findUnique").mockResolvedValue({
        id: MOCK_THEORY_ID,
        investigationId: MOCK_INVESTIGATION_ID,
      } as any);

      vi.spyOn(BoardGuard, "verifyEvidenceAccessForBoard").mockResolvedValue({
        id: MOCK_CLUE_ID,
        title: "SSH Access Logs",
        clueCode: "LOG-02",
        clueType: "NETWORK" as any,
      } as any);

      vi.spyOn(prisma.theoryEvidence, "upsert").mockResolvedValue({
        id: "assoc-1",
        theoryId: MOCK_THEORY_ID,
        clueId: MOCK_CLUE_ID,
        relationship: TheoryEvidenceRelationship.SUPPORTS,
        explanation: "Shows privileged login at 02:00 AM",
        createdByPlayerId: MOCK_PROFILE_ID,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const assoc = await TheoryService.addTheoryEvidence(
        MOCK_USER_ID,
        MOCK_INVESTIGATION_ID,
        MOCK_THEORY_ID,
        {
          clueId: MOCK_CLUE_ID,
          relationship: TheoryEvidenceRelationship.SUPPORTS,
          explanation: "Shows privileged login at 02:00 AM",
        }
      );

      expect(assoc.relationship).toBe(TheoryEvidenceRelationship.SUPPORTS);
      expect(assoc.clueTitle).toBe("SSH Access Logs");
    });
  });

  // ==========================================================================
  // SECTION 7: API Route Handlers
  // ==========================================================================
  describe("API Route Handlers", () => {
    it("GET /api/investigations/[investigationId]/board returns 200 with board payload", async () => {
      const getBoardSpy = vi
        .spyOn(InvestigationBoardService, "getOrCreateBoard")
        .mockResolvedValue({
          id: MOCK_BOARD_ID,
          investigationId: MOCK_INVESTIGATION_ID,
          title: "Crime Board",
          description: null,
          viewport: { zoom: 1, panX: 0, panY: 0 },
          nodes: [],
          connections: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });

      const req = new NextRequest("http://localhost:3000/api/investigations/123/board");
      const res = await getBoardRoute(req, {
        params: Promise.resolve({ investigationId: MOCK_INVESTIGATION_ID }),
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(json.data.board.id).toBe(MOCK_BOARD_ID);
      getBoardSpy.mockRestore();
    });

    it("POST /api/investigations/[investigationId]/board/nodes creates node and returns 201", async () => {
      const createNodeSpy = vi.spyOn(BoardNodeService, "createNode").mockResolvedValue({
        id: MOCK_NODE_ID_1,
        boardId: MOCK_BOARD_ID,
        nodeType: BoardNodeType.NOTE,
        referencedEntityId: null,
        title: "Sticky Note",
        description: "Note description",
        positionX: 150,
        positionY: 200,
        width: 240,
        height: null,
        color: null,
        metadata: {},
        createdByPlayerId: MOCK_PROFILE_ID,
        createdByCodename: "CIPHER",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const req = new NextRequest("http://localhost:3000/api/investigations/123/board/nodes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nodeType: BoardNodeType.NOTE,
          title: "Sticky Note",
          positionX: 150,
          positionY: 200,
        }),
      });

      const res = await createNodeRoute(req, {
        params: Promise.resolve({ investigationId: MOCK_INVESTIGATION_ID }),
      });

      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(json.data.node.title).toBe("Sticky Note");
      createNodeSpy.mockRestore();
    });
  });
});
