import { describe, it, expect, vi, beforeEach } from "vitest";
import { InvestigationService } from "@/modules/investigations/services/investigation.service";
import {
  StartInvestigationSchema,
  InvestigationTransitionSchema,
  UpdateChapterProgressSchema,
} from "@/modules/investigations/validation/investigation.schema";
import {
  POST as startInvestigationRoute,
  GET as getInvestigationsRoute,
} from "@/app/api/investigations/route";
import { GET as getWorkspaceRoute } from "@/app/api/investigations/[investigationId]/route";
import { PATCH as transitionStatusRoute } from "@/app/api/investigations/[investigationId]/status/route";
import {
  GET as getProgressRoute,
  PATCH as updateProgressRoute,
} from "@/app/api/investigations/[investigationId]/progress/route";
import * as authGuard from "@/modules/authentication/guards/auth.guard";
import { prisma } from "@/server/infrastructure/database";
import { AppError } from "@/lib/errors/app-error";
import {
  ContentStatus,
  InvestigationStatus,
  ParticipantStatus,
  ChapterProgressStatus,
  CaseDifficulty,
  PlayMode,
} from "@prisma/client";
import { NextRequest } from "next/server";

describe("Investigation Engine & Session Management (Phase 07)", () => {
  const MOCK_USER_ID = "00000000-0000-4000-a000-000000000001";
  const MOCK_OTHER_USER_ID = "00000000-0000-4000-a000-000000000002";
  const MOCK_PROFILE_ID = "00000000-0000-4000-a000-000000000003";
  const MOCK_OTHER_PROFILE_ID = "00000000-0000-4000-a000-000000000004";
  const MOCK_CASE_ID = "00000000-0000-4000-a000-000000000005";
  const MOCK_CHAPTER_ID_1 = "00000000-0000-4000-a000-000000000006";
  const MOCK_CHAPTER_ID_2 = "00000000-0000-4000-a000-000000000007";
  const MOCK_INVESTIGATION_ID = "00000000-0000-4000-a000-000000000008";

  const mockAuthenticatedUser = {
    id: MOCK_USER_ID,
    telegramId: "123456789",
  };

  const mockDbCase = {
    id: MOCK_CASE_ID,
    caseCode: "CASE-001-MIDNIGHT-PROTOCOL",
    title: "The Midnight Protocol",
    description: "Zurich communication relay disruption investigation.",
    difficulty: CaseDifficulty.MEDIUM,
    estimatedDurationMinutes: 45,
    minPlayers: 1,
    maxPlayers: 4,
    supportedPlayModes: [PlayMode.SOLO, PlayMode.COOPERATIVE],
    status: ContentStatus.PUBLISHED,
    publishedAt: new Date("2026-01-15T00:00:00Z"),
    chapters: [
      {
        id: MOCK_CHAPTER_ID_1,
        caseId: MOCK_CASE_ID,
        chapterOrder: 1,
        title: "Act 1: The Zurich Blackout",
        description: "Analyze initial signal telemetry.",
        status: ContentStatus.PUBLISHED,
      },
      {
        id: MOCK_CHAPTER_ID_2,
        caseId: MOCK_CASE_ID,
        chapterOrder: 2,
        title: "Act 2: Echoes in the Static",
        description: "Cross-reference employee badge records.",
        status: ContentStatus.PUBLISHED,
      },
    ],
    characters: [
      {
        id: "char_1",
        name: "Dr. Elena Vance",
        description: "Telecommunications lead.",
        metadata: { role: "Chief Architect", clearance: "TOP SECRET" },
      },
    ],
    campaign: null,
    _count: {
      chapters: 2,
      characters: 1,
    },
  };

  const createMockInvestigation = () => ({
    id: MOCK_INVESTIGATION_ID,
    caseId: MOCK_CASE_ID,
    status: InvestigationStatus.IN_PROGRESS,
    playMode: PlayMode.SOLO,
    startedAt: new Date("2026-11-06T08:00:00Z"),
    completedAt: null,
    createdAt: new Date("2026-11-06T08:00:00Z"),
    updatedAt: new Date("2026-11-06T08:00:00Z"),
    case: mockDbCase,
    participants: [
      {
        id: "part_1",
        investigationId: MOCK_INVESTIGATION_ID,
        playerId: MOCK_PROFILE_ID,
        status: ParticipantStatus.ACTIVE,
        joinedAt: new Date("2026-11-06T08:00:00Z"),
      },
    ],
    progress: [
      {
        id: "prog_1",
        investigationId: MOCK_INVESTIGATION_ID,
        chapterId: MOCK_CHAPTER_ID_1,
        status: ChapterProgressStatus.IN_PROGRESS,
        unlockedAt: new Date("2026-11-06T08:00:00Z"),
        completedAt: null,
        chapter: mockDbCase.chapters[0],
      },
      {
        id: "prog_2",
        investigationId: MOCK_INVESTIGATION_ID,
        chapterId: MOCK_CHAPTER_ID_2,
        status: ChapterProgressStatus.LOCKED,
        unlockedAt: null,
        completedAt: null,
        chapter: mockDbCase.chapters[1],
      },
    ],
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(authGuard, "requireAuthenticatedUser").mockResolvedValue(mockAuthenticatedUser as any);
    vi.spyOn(authGuard, "getCurrentUser").mockResolvedValue(mockAuthenticatedUser as any);
  });

  // =========================================================================
  // 1. Validation Schemas
  // =========================================================================
  describe("Investigation Schemas Validation", () => {
    it("StartInvestigationSchema should validate valid case code and UUID", () => {
      const codeValid = StartInvestigationSchema.safeParse({
        caseIdentifier: "CASE-001-MIDNIGHT-PROTOCOL",
      });
      const uuidValid = StartInvestigationSchema.safeParse({
        caseIdentifier: MOCK_CASE_ID,
      });

      expect(codeValid.success).toBe(true);
      expect(uuidValid.success).toBe(true);
    });

    it("StartInvestigationSchema should reject empty identifier", () => {
      const empty = StartInvestigationSchema.safeParse({
        caseIdentifier: "   ",
      });
      expect(empty.success).toBe(false);
    });

    it("InvestigationTransitionSchema should accept valid actions (PAUSE, RESUME, ABANDON, COMPLETE)", () => {
      expect(InvestigationTransitionSchema.safeParse({ action: "PAUSE" }).success).toBe(true);
      expect(InvestigationTransitionSchema.safeParse({ action: "RESUME" }).success).toBe(true);
      expect(InvestigationTransitionSchema.safeParse({ action: "ABANDON" }).success).toBe(true);
      expect(InvestigationTransitionSchema.safeParse({ action: "COMPLETE" }).success).toBe(true);
      expect(InvestigationTransitionSchema.safeParse({ action: "INVALID_ACTION" }).success).toBe(
        false
      );
    });

    it("UpdateChapterProgressSchema should validate valid chapter UUID and progression action", () => {
      const valid = UpdateChapterProgressSchema.safeParse({
        chapterId: MOCK_CHAPTER_ID_1,
        action: "START_CHAPTER",
      });
      expect(valid.success).toBe(true);

      const invalidUuid = UpdateChapterProgressSchema.safeParse({
        chapterId: "not-a-uuid",
        action: "START_CHAPTER",
      });
      expect(invalidUuid.success).toBe(false);
    });
  });

  // =========================================================================
  // 2. Starting Investigations & Duplicate Prevention
  // =========================================================================
  describe("InvestigationService.startInvestigation", () => {
    it("should create a new investigation session when no active session exists", async () => {
      vi.spyOn(prisma.playerProfile, "findUnique").mockResolvedValueOnce({
        id: MOCK_PROFILE_ID,
      } as any);
      vi.spyOn(prisma.case, "findFirst").mockResolvedValueOnce(mockDbCase as any);

      // Mock $transaction callback execution
      vi.spyOn(prisma, "$transaction").mockImplementationOnce(async (callback: any) => {
        const txMock = {
          investigationParticipant: {
            findFirst: vi.fn().mockResolvedValue(null), // No active session
            create: vi.fn().mockResolvedValue({ id: "part_new" }),
          },
          investigation: {
            create: vi.fn().mockResolvedValue({ id: "inv_new" }),
          },
          investigationProgress: {
            createMany: vi.fn().mockResolvedValue({ count: 2 }),
          },
        };
        return callback(txMock);
      });

      const result = await InvestigationService.startInvestigation(
        MOCK_USER_ID,
        "CASE-001-MIDNIGHT-PROTOCOL"
      );

      expect(result.investigationId).toBe("inv_new");
      expect(result.wasResumed).toBe(false);
    });

    it("should safely reuse and return an existing active investigation (duplicate prevention)", async () => {
      vi.spyOn(prisma.playerProfile, "findUnique").mockResolvedValueOnce({
        id: MOCK_PROFILE_ID,
      } as any);
      vi.spyOn(prisma.case, "findFirst").mockResolvedValueOnce(mockDbCase as any);

      vi.spyOn(prisma, "$transaction").mockImplementationOnce(async (callback: any) => {
        const txMock = {
          investigationParticipant: {
            findFirst: vi.fn().mockResolvedValue({
              id: "part_existing",
              investigationId: MOCK_INVESTIGATION_ID,
              investigation: {
                id: MOCK_INVESTIGATION_ID,
                status: InvestigationStatus.IN_PROGRESS,
              },
            }),
          },
          investigation: { update: vi.fn() },
        };
        return callback(txMock);
      });

      const result = await InvestigationService.startInvestigation(
        MOCK_USER_ID,
        "CASE-001-MIDNIGHT-PROTOCOL"
      );

      expect(result.investigationId).toBe(MOCK_INVESTIGATION_ID);
      expect(result.wasResumed).toBe(true);
    });

    it("should resume a PAUSED investigation to IN_PROGRESS upon start request", async () => {
      vi.spyOn(prisma.playerProfile, "findUnique").mockResolvedValueOnce({
        id: MOCK_PROFILE_ID,
      } as any);
      vi.spyOn(prisma.case, "findFirst").mockResolvedValueOnce(mockDbCase as any);

      const updateSpy = vi.fn().mockResolvedValue({});

      vi.spyOn(prisma, "$transaction").mockImplementationOnce(async (callback: any) => {
        const txMock = {
          investigationParticipant: {
            findFirst: vi.fn().mockResolvedValue({
              id: "part_existing",
              investigationId: MOCK_INVESTIGATION_ID,
              investigation: {
                id: MOCK_INVESTIGATION_ID,
                status: InvestigationStatus.PAUSED,
                startedAt: new Date("2026-11-06T08:00:00Z"),
              },
            }),
          },
          investigation: { update: updateSpy },
        };
        return callback(txMock);
      });

      const result = await InvestigationService.startInvestigation(
        MOCK_USER_ID,
        "CASE-001-MIDNIGHT-PROTOCOL"
      );

      expect(result.wasResumed).toBe(true);
      expect(updateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: MOCK_INVESTIGATION_ID },
          data: expect.objectContaining({
            status: InvestigationStatus.IN_PROGRESS,
          }),
        })
      );
    });

    it("should throw 404 CASE_NOT_FOUND if case is draft or non-existent", async () => {
      vi.spyOn(prisma.playerProfile, "findUnique").mockResolvedValueOnce({
        id: MOCK_PROFILE_ID,
      } as any);
      vi.spyOn(prisma.case, "findFirst").mockResolvedValueOnce(null);

      await expect(
        InvestigationService.startInvestigation(MOCK_USER_ID, "CASE-RESTRICTED")
      ).rejects.toThrow(AppError);
    });
  });

  // =========================================================================
  // 3. Authorization & Workspace Retrieval
  // =========================================================================
  describe("InvestigationService.getInvestigationWorkspace", () => {
    it("should return full workspace for authorized active participant", async () => {
      vi.spyOn(prisma.playerProfile, "findUnique").mockResolvedValueOnce({
        id: MOCK_PROFILE_ID,
      } as any);
      vi.spyOn(prisma.investigation, "findUnique").mockResolvedValueOnce(
        createMockInvestigation() as any
      );

      const workspace = await InvestigationService.getInvestigationWorkspace(
        MOCK_USER_ID,
        MOCK_INVESTIGATION_ID
      );

      expect(workspace.id).toBe(MOCK_INVESTIGATION_ID);
      expect(workspace.status).toBe(InvestigationStatus.IN_PROGRESS);
      expect(workspace.case.caseCode).toBe("CASE-001-MIDNIGHT-PROTOCOL");
      expect(workspace.chapters).toHaveLength(2);
      expect(workspace.chapters[0].status).toBe(ChapterProgressStatus.IN_PROGRESS);
      expect(workspace.chapters[1].status).toBe(ChapterProgressStatus.LOCKED);
      expect(workspace.characters).toHaveLength(1);
    });

    it("should deny access and throw 404 if user is not a participant of the investigation", async () => {
      vi.spyOn(prisma.playerProfile, "findUnique").mockResolvedValueOnce({
        id: MOCK_OTHER_PROFILE_ID,
      } as any);
      vi.spyOn(prisma.investigation, "findUnique").mockResolvedValueOnce({
        ...createMockInvestigation(),
        participants: [], // User is not an active participant
      } as any);

      await expect(
        InvestigationService.getInvestigationWorkspace(MOCK_OTHER_USER_ID, MOCK_INVESTIGATION_ID)
      ).rejects.toThrow(AppError);
    });

    it("should throw 400 for malformed investigation ID", async () => {
      vi.spyOn(prisma.playerProfile, "findUnique").mockResolvedValueOnce({
        id: MOCK_PROFILE_ID,
      } as any);

      try {
        await InvestigationService.getInvestigationWorkspace(MOCK_USER_ID, "invalid-id");
        expect.unreachable();
      } catch (err: any) {
        expect(err.statusCode).toBe(400);
        expect(err.code).toBe("INVALID_INVESTIGATION_ID");
      }
    });
  });

  // =========================================================================
  // 4. State Machine & Status Transitions
  // =========================================================================
  describe("Investigation Lifecycle Transitions", () => {
    it("should successfully PAUSE an active IN_PROGRESS investigation", async () => {
      vi.spyOn(prisma.playerProfile, "findUnique").mockResolvedValue({
        id: MOCK_PROFILE_ID,
      } as any);
      vi.spyOn(prisma.investigation, "findUnique").mockResolvedValueOnce({
        ...createMockInvestigation(),
        status: InvestigationStatus.IN_PROGRESS,
      } as any);
      const updateSpy = vi.spyOn(prisma.investigation, "update").mockResolvedValueOnce({
        updatedAt: new Date(),
      } as any);

      const result = await InvestigationService.transitionStatus(
        MOCK_USER_ID,
        MOCK_INVESTIGATION_ID,
        "PAUSE"
      );

      expect(updateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: InvestigationStatus.PAUSED }),
        })
      );
      expect(result.status).toBe(InvestigationStatus.PAUSED);
    });

    it("should reject pausing an investigation that is not IN_PROGRESS", async () => {
      vi.spyOn(prisma.playerProfile, "findUnique").mockResolvedValueOnce({
        id: MOCK_PROFILE_ID,
      } as any);
      vi.spyOn(prisma.investigation, "findUnique").mockResolvedValueOnce({
        ...createMockInvestigation(),
        status: InvestigationStatus.SOLVED,
      } as any);

      await expect(
        InvestigationService.transitionStatus(MOCK_USER_ID, MOCK_INVESTIGATION_ID, "PAUSE")
      ).rejects.toThrow("Cannot pause investigation");
    });

    it("should reject concluding an investigation if incomplete chapters remain", async () => {
      vi.spyOn(prisma.playerProfile, "findUnique").mockResolvedValueOnce({
        id: MOCK_PROFILE_ID,
      } as any);
      vi.spyOn(prisma.investigation, "findUnique").mockResolvedValueOnce({
        ...createMockInvestigation(),
        status: InvestigationStatus.IN_PROGRESS,
        progress: [
          { status: ChapterProgressStatus.COMPLETED },
          { status: ChapterProgressStatus.LOCKED }, // Chapter 2 still locked
        ],
      } as any);

      await expect(
        InvestigationService.transitionStatus(MOCK_USER_ID, MOCK_INVESTIGATION_ID, "COMPLETE")
      ).rejects.toThrow(
        "Cannot conclude investigation: unresolved tactical acts or chapters remain"
      );
    });

    it("should successfully conclude an investigation (SOLVED) when all chapters are complete", async () => {
      const mockInv = createMockInvestigation();
      vi.spyOn(prisma.playerProfile, "findUnique").mockResolvedValue({
        id: MOCK_PROFILE_ID,
      } as any);
      vi.spyOn(prisma.investigation, "findUnique").mockResolvedValueOnce({
        ...mockInv,
        status: InvestigationStatus.IN_PROGRESS,
        progress: [
          {
            ...mockInv.progress[0],
            status: ChapterProgressStatus.COMPLETED,
          },
          {
            ...mockInv.progress[1],
            status: ChapterProgressStatus.COMPLETED,
          },
        ],
      } as any);
      const updateSpy = vi.spyOn(prisma.investigation, "update").mockResolvedValueOnce({
        updatedAt: new Date(),
      } as any);

      const result = await InvestigationService.transitionStatus(
        MOCK_USER_ID,
        MOCK_INVESTIGATION_ID,
        "COMPLETE"
      );

      expect(updateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: InvestigationStatus.SOLVED }),
        })
      );
      expect(result.status).toBe(InvestigationStatus.SOLVED);
    });
  });

  // =========================================================================
  // 5. Chapter Progression Engine
  // =========================================================================
  describe("Chapter Progression Engine", () => {
    it("should complete current chapter and automatically unlock the next chapter", async () => {
      vi.spyOn(prisma.playerProfile, "findUnique").mockResolvedValue({
        id: MOCK_PROFILE_ID,
      } as any);
      vi.spyOn(prisma.investigation, "findUnique").mockResolvedValueOnce({
        ...createMockInvestigation(),
        status: InvestigationStatus.IN_PROGRESS,
      } as any);

      const progressUpdateSpy = vi
        .spyOn(prisma.investigationProgress, "update")
        .mockResolvedValue({} as any);
      vi.spyOn(prisma.investigation, "update").mockResolvedValue({
        updatedAt: new Date(),
      } as any);

      const result = await InvestigationService.updateChapterProgress(
        MOCK_USER_ID,
        MOCK_INVESTIGATION_ID,
        MOCK_CHAPTER_ID_1,
        "COMPLETE_CHAPTER"
      );

      // Verify current chapter was completed
      expect(progressUpdateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "prog_1" },
          data: expect.objectContaining({ status: ChapterProgressStatus.COMPLETED }),
        })
      );

      // Verify next chapter (Act 2) was unlocked
      expect(progressUpdateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "prog_2" },
          data: expect.objectContaining({ status: ChapterProgressStatus.UNLOCKED }),
        })
      );

      expect(result.completedChaptersCount).toBe(1);
    });

    it("should reject starting a locked chapter", async () => {
      vi.spyOn(prisma.playerProfile, "findUnique").mockResolvedValueOnce({
        id: MOCK_PROFILE_ID,
      } as any);
      vi.spyOn(prisma.investigation, "findUnique").mockResolvedValueOnce({
        ...createMockInvestigation(),
        status: InvestigationStatus.IN_PROGRESS,
      } as any);

      await expect(
        InvestigationService.updateChapterProgress(
          MOCK_USER_ID,
          MOCK_INVESTIGATION_ID,
          MOCK_CHAPTER_ID_2, // Chapter 2 is LOCKED
          "START_CHAPTER"
        )
      ).rejects.toThrow("Cannot start locked chapter");
    });

    it("should reject progression updates when investigation is PAUSED", async () => {
      vi.spyOn(prisma.playerProfile, "findUnique").mockResolvedValueOnce({
        id: MOCK_PROFILE_ID,
      } as any);
      vi.spyOn(prisma.investigation, "findUnique").mockResolvedValueOnce({
        ...createMockInvestigation(),
        status: InvestigationStatus.PAUSED,
      } as any);

      await expect(
        InvestigationService.updateChapterProgress(
          MOCK_USER_ID,
          MOCK_INVESTIGATION_ID,
          MOCK_CHAPTER_ID_1,
          "COMPLETE_CHAPTER"
        )
      ).rejects.toThrow("Cannot update chapter progress while investigation is 'PAUSED'");
    });
  });

  // =========================================================================
  // 6. Investigation History Queries
  // =========================================================================
  describe("InvestigationService.getPlayerInvestigations", () => {
    it("should return paginated investigation history for authenticated player", async () => {
      vi.spyOn(prisma.playerProfile, "findUnique").mockResolvedValueOnce({
        id: MOCK_PROFILE_ID,
      } as any);
      vi.spyOn(prisma.investigationParticipant, "findMany").mockResolvedValueOnce([
        {
          id: "part_1",
          playerId: MOCK_PROFILE_ID,
          investigation: {
            id: MOCK_INVESTIGATION_ID,
            status: InvestigationStatus.IN_PROGRESS,
            playMode: PlayMode.SOLO,
            startedAt: new Date("2026-11-06T08:00:00Z"),
            completedAt: null,
            updatedAt: new Date("2026-11-06T08:30:00Z"),
            case: {
              id: MOCK_CASE_ID,
              caseCode: "CASE-001-MIDNIGHT-PROTOCOL",
              title: "The Midnight Protocol",
              difficulty: CaseDifficulty.MEDIUM,
              estimatedDurationMinutes: 45,
            },
            progress: [
              {
                status: ChapterProgressStatus.COMPLETED,
                chapter: { chapterOrder: 1 },
              },
              {
                status: ChapterProgressStatus.IN_PROGRESS,
                chapter: { chapterOrder: 2 },
              },
            ],
            _count: { participants: 1 },
          },
        } as any,
      ]);
      vi.spyOn(prisma.investigationParticipant, "count").mockResolvedValueOnce(1);

      const history = await InvestigationService.getPlayerInvestigations(MOCK_USER_ID, {
        page: 1,
        limit: 10,
      });

      expect(history.total).toBe(1);
      expect(history.items).toHaveLength(1);
      expect(history.items[0].caseCode).toBe("CASE-001-MIDNIGHT-PROTOCOL");
      expect(history.items[0].completedChaptersCount).toBe(1);
      expect(history.items[0].currentChapterOrder).toBe(2);
    });
  });

  // =========================================================================
  // 7. API Route Handlers
  // =========================================================================
  describe("Investigation API Routes", () => {
    it("POST /api/investigations should start an investigation and return HTTP 201 or 200", async () => {
      vi.spyOn(InvestigationService, "startInvestigation").mockResolvedValueOnce({
        investigationId: MOCK_INVESTIGATION_ID,
        wasResumed: false,
      });

      const req = new NextRequest("http://localhost:3000/api/investigations", {
        method: "POST",
        body: JSON.stringify({ caseIdentifier: "CASE-001-MIDNIGHT-PROTOCOL" }),
      });

      const res = await startInvestigationRoute(req);
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(json.data.investigationId).toBe(MOCK_INVESTIGATION_ID);
    });

    it("GET /api/investigations should return HTTP 200 with player history", async () => {
      vi.spyOn(InvestigationService, "getPlayerInvestigations").mockResolvedValueOnce({
        items: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 1,
        hasMore: false,
      });

      const req = new NextRequest("http://localhost:3000/api/investigations?page=1");
      const res = await getInvestigationsRoute(req);

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.ok).toBe(true);
    });

    it("GET /api/investigations/[investigationId] should return HTTP 200 with workspace", async () => {
      vi.spyOn(InvestigationService, "getInvestigationWorkspace").mockResolvedValueOnce({
        id: MOCK_INVESTIGATION_ID,
        status: InvestigationStatus.IN_PROGRESS,
      } as any);

      const req = new NextRequest(
        `http://localhost:3000/api/investigations/${MOCK_INVESTIGATION_ID}`
      );
      const res = await getWorkspaceRoute(req, {
        params: Promise.resolve({ investigationId: MOCK_INVESTIGATION_ID }),
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.id).toBe(MOCK_INVESTIGATION_ID);
    });

    it("PATCH /api/investigations/[investigationId]/status should transition status", async () => {
      vi.spyOn(InvestigationService, "transitionStatus").mockResolvedValueOnce({
        id: MOCK_INVESTIGATION_ID,
        status: InvestigationStatus.PAUSED,
      } as any);

      const req = new NextRequest(
        `http://localhost:3000/api/investigations/${MOCK_INVESTIGATION_ID}/status`,
        {
          method: "PATCH",
          body: JSON.stringify({ action: "PAUSE" }),
        }
      );
      const res = await transitionStatusRoute(req, {
        params: Promise.resolve({ investigationId: MOCK_INVESTIGATION_ID }),
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.status).toBe(InvestigationStatus.PAUSED);
    });

    it("PATCH /api/investigations/[investigationId]/progress should update chapter progress", async () => {
      vi.spyOn(InvestigationService, "updateChapterProgress").mockResolvedValueOnce({
        id: MOCK_INVESTIGATION_ID,
        completedChaptersCount: 1,
      } as any);

      const req = new NextRequest(
        `http://localhost:3000/api/investigations/${MOCK_INVESTIGATION_ID}/progress`,
        {
          method: "PATCH",
          body: JSON.stringify({
            chapterId: MOCK_CHAPTER_ID_1,
            action: "COMPLETE_CHAPTER",
          }),
        }
      );
      const res = await updateProgressRoute(req, {
        params: Promise.resolve({ investigationId: MOCK_INVESTIGATION_ID }),
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.completedChaptersCount).toBe(1);
    });
  });
});
