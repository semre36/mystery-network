import { describe, it, expect, vi, beforeEach } from "vitest";
import { EvidenceService } from "@/modules/evidence/services/evidence.service";
import { StorageService } from "@/modules/evidence/services/storage.service";
import {
  EvidenceQuerySchema,
  SaveEvidenceNoteSchema,
  ShareEvidenceSchema,
} from "@/modules/evidence/validation/evidence.schema";
import { GET as getEvidenceListRoute } from "@/app/api/investigations/[investigationId]/evidence/route";
import { GET as getEvidenceDetailRoute } from "@/app/api/investigations/[investigationId]/evidence/[evidenceId]/route";
import {
  POST as saveEvidenceNoteRoute,
  PATCH as updateEvidenceNoteRoute,
  DELETE as deleteEvidenceNoteRoute,
} from "@/app/api/investigations/[investigationId]/evidence/[evidenceId]/notes/route";
import { POST as shareEvidenceRoute } from "@/app/api/investigations/[investigationId]/evidence/[evidenceId]/share/route";
import { DELETE as revokeEvidenceShareRoute } from "@/app/api/investigations/[investigationId]/evidence/[evidenceId]/share/[shareId]/route";
import { GET as getEvidenceAssetRoute } from "@/app/api/investigations/[investigationId]/evidence/[evidenceId]/assets/[assetId]/route";
import * as authGuard from "@/modules/authentication/guards/auth.guard";
import { prisma } from "@/server/infrastructure/database";
import { AppError } from "@/lib/errors/app-error";
import {
  ContentStatus,
  ClueType,
  ClueStrategy,
  AssignmentStatus,
  ParticipantStatus,
  ChapterProgressStatus,
  AssetType,
} from "@prisma/client";
import { NextRequest } from "next/server";

describe("Evidence System & Clue Distribution (Phase 08)", () => {
  const MOCK_USER_ID = "00000000-0000-4000-a000-000000000001";
  const MOCK_OTHER_USER_ID = "00000000-0000-4000-a000-000000000002";
  const MOCK_PROFILE_ID = "00000000-0000-4000-a000-000000000003";
  const MOCK_OTHER_PROFILE_ID = "00000000-0000-4000-a000-000000000004";
  const MOCK_CASE_ID = "00000000-0000-4000-a000-000000000005";
  const MOCK_CHAPTER_ID_1 = "00000000-0000-4000-a000-000000000006";
  const MOCK_CHAPTER_ID_2 = "00000000-0000-4000-a000-000000000007";
  const MOCK_INVESTIGATION_ID = "00000000-0000-4000-a000-000000000008";
  const MOCK_CLUE_ID_1 = "00000000-0000-4000-a000-000000000009";
  const MOCK_CLUE_ID_2 = "00000000-0000-4000-a000-00000000000a";
  const MOCK_LOCKED_CLUE_ID = "00000000-0000-4000-a000-00000000000b";

  const mockAuthenticatedUser = {
    id: MOCK_USER_ID,
    telegramId: "123456789",
  };

  const createMockClue = (overrides: Record<string, any> = {}) => ({
    id: MOCK_CLUE_ID_1,
    clueCode: "EVID-ZR-01",
    caseId: MOCK_CASE_ID,
    chapterId: MOCK_CHAPTER_ID_1,
    title: "Zurich Server Terminal Log",
    description: "A partially corrupted console dump recovered from Zurich Relay 7.",
    content: { event: "OVERRIDE_AUTH_FAILURE", terminal: "TERM-ZR-07" },
    clueType: ClueType.DOCUMENT,
    assignmentStrategy: ClueStrategy.ASYMMETRIC_EXCLUSIVE,
    visibilityConfig: { classification: "RESTRICTED" },
    isShareable: true,
    status: ContentStatus.PUBLISHED,
    createdAt: new Date("2026-11-06T08:00:00Z"),
    updatedAt: new Date("2026-11-06T08:00:00Z"),
    chapter: {
      id: MOCK_CHAPTER_ID_1,
      title: "Act 1: The Zurich Blackout",
      chapterOrder: 1,
    },
    assets: [],
    ...overrides,
  });

  const createMockInvestigation = (overrides: Record<string, any> = {}) => ({
    id: MOCK_INVESTIGATION_ID,
    caseId: MOCK_CASE_ID,
    case: {
      id: MOCK_CASE_ID,
      caseCode: "CASE-001-MIDNIGHT-PROTOCOL",
      title: "The Midnight Protocol",
    },
    participants: [
      {
        id: "part_lead",
        investigationId: MOCK_INVESTIGATION_ID,
        playerId: MOCK_PROFILE_ID,
        status: ParticipantStatus.ACTIVE,
      },
    ],
    progress: [
      {
        id: "prog_act1",
        chapterId: MOCK_CHAPTER_ID_1,
        status: ChapterProgressStatus.IN_PROGRESS,
      },
      {
        id: "prog_act2",
        chapterId: MOCK_CHAPTER_ID_2,
        status: ChapterProgressStatus.LOCKED,
      },
    ],
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(authGuard, "requireAuthenticatedUser").mockResolvedValue(mockAuthenticatedUser as any);
    vi.spyOn(prisma, "$transaction").mockImplementation(async (callback: any) => {
      if (typeof callback === "function") {
        return callback(prisma);
      }
      return callback;
    });
  });

  // =========================================================================
  // 1. Validation Schemas & Asset Storage Security
  // =========================================================================
  describe("Validation Schemas & Storage Security", () => {
    it("EvidenceQuerySchema should accept valid parameters and reject invalid values", () => {
      const valid = EvidenceQuerySchema.safeParse({
        type: "DOCUMENT",
        scope: "MINE",
        page: "2",
        limit: "15",
      });
      expect(valid.success).toBe(true);

      const invalidScope = EvidenceQuerySchema.safeParse({
        scope: "NON_EXISTENT_SCOPE",
      });
      expect(invalidScope.success).toBe(false);
    });

    it("SaveEvidenceNoteSchema should validate content length constraints", () => {
      const valid = SaveEvidenceNoteSchema.safeParse({
        content: "Suspect logged into server 10 minutes prior to blackout.",
      });
      expect(valid.success).toBe(true);

      const empty = SaveEvidenceNoteSchema.safeParse({ content: "   " });
      expect(empty.success).toBe(false);

      const tooLong = SaveEvidenceNoteSchema.safeParse({
        content: "a".repeat(2001),
      });
      expect(tooLong.success).toBe(false);
    });

    it("StorageService.validateAssetMetadata should enforce strict MIME types and file limits", () => {
      const validImage = StorageService.validateAssetMetadata({
        fileName: "telemetry.png",
        mimeType: "image/png",
        fileSizeBytes: 245120,
      });
      expect(validImage.valid).toBe(true);

      const unapprovedMime = StorageService.validateAssetMetadata({
        fileName: "malicious.exe",
        mimeType: "application/x-msdownload",
        fileSizeBytes: 1024,
      });
      expect(unapprovedMime.valid).toBe(false);
      expect(unapprovedMime.reason).toContain("not permitted");

      const oversizedFile = StorageService.validateAssetMetadata({
        fileName: "heavy_dump.pdf",
        mimeType: "application/pdf",
        fileSizeBytes: 15 * 1024 * 1024, // 15MB > 10MB limit
      });
      expect(oversizedFile.valid).toBe(false);
      expect(oversizedFile.reason).toContain("exceeds the platform limit");
    });

    it("StorageService should generate collision-resistant keys and secure internal URLs", () => {
      const key1 = StorageService.generateStorageKey("case_1", "clue_1", "log.txt");
      const key2 = StorageService.generateStorageKey("case_1", "clue_1", "log.txt");
      expect(key1).not.toBe(key2);
      expect(key1).toContain("evidence/case_1/clue_1/");

      const url = StorageService.getSecureAccessUrl(
        MOCK_INVESTIGATION_ID,
        MOCK_CLUE_ID_1,
        "asset_1"
      );
      expect(url).toBe(
        `/api/investigations/${MOCK_INVESTIGATION_ID}/evidence/${MOCK_CLUE_ID_1}/assets/asset_1`
      );
    });
  });

  // =========================================================================
  // 2. Evidence Access Control & Asymmetric Privacy
  // =========================================================================
  describe("Evidence Access & Authorization", () => {
    it("should allow an assigned participant to inspect their private evidence", async () => {
      vi.spyOn(prisma.playerProfile, "findUnique").mockResolvedValueOnce({
        id: MOCK_PROFILE_ID,
      } as any);
      vi.spyOn(prisma.investigation, "findUnique").mockResolvedValueOnce(
        createMockInvestigation() as any
      );
      vi.spyOn(prisma.clue, "findUnique").mockResolvedValueOnce(createMockClue() as any);

      // Direct assignment exists
      vi.spyOn(prisma.clueAssignment, "findUnique").mockResolvedValueOnce({
        id: "assign_1",
        investigationId: MOCK_INVESTIGATION_ID,
        clueId: MOCK_CLUE_ID_1,
        playerId: MOCK_PROFILE_ID,
        status: AssignmentStatus.UNSEEN,
        assignedAt: new Date("2026-11-06T08:00:00Z"),
      } as any);

      // Status update to VIEWED
      const updateAssignSpy = vi
        .spyOn(prisma.clueAssignment, "update")
        .mockResolvedValueOnce({} as any);
      vi.spyOn(prisma.evidenceNote, "findUnique").mockResolvedValueOnce(null);
      vi.spyOn(prisma.evidenceShare, "findMany").mockResolvedValueOnce([]);
      vi.spyOn(prisma.investigationParticipant, "findMany").mockResolvedValueOnce([]);

      const detail = await EvidenceService.getEvidenceDetail(
        MOCK_USER_ID,
        MOCK_INVESTIGATION_ID,
        MOCK_CLUE_ID_1
      );

      expect(detail.id).toBe(MOCK_CLUE_ID_1);
      expect(detail.accessType).toBe("ASSIGNED");
      expect(detail.assignmentStatus).toBe(AssignmentStatus.VIEWED);
      expect(updateAssignSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: AssignmentStatus.VIEWED }),
        })
      );
    });

    it("should deny access and return 404 when an operative queries another player's unshared private clue", async () => {
      vi.spyOn(prisma.playerProfile, "findUnique").mockResolvedValueOnce({
        id: MOCK_PROFILE_ID,
      } as any);
      vi.spyOn(prisma.investigation, "findUnique").mockResolvedValueOnce(
        createMockInvestigation() as any
      );
      vi.spyOn(prisma.clue, "findUnique").mockResolvedValueOnce(
        createMockClue({ assignmentStrategy: ClueStrategy.ASYMMETRIC_EXCLUSIVE }) as any
      );

      // Not directly assigned to caller
      vi.spyOn(prisma.clueAssignment, "findUnique").mockResolvedValueOnce(null);
      // Not shared with caller
      vi.spyOn(prisma.evidenceShare, "findFirst").mockResolvedValueOnce(null);

      await expect(
        EvidenceService.getEvidenceDetail(MOCK_USER_ID, MOCK_INVESTIGATION_ID, MOCK_CLUE_ID_1)
      ).rejects.toThrow("Evidence record not found or restricted");
    });

    it("should deny inspection of locked chapter evidence", async () => {
      vi.spyOn(prisma.playerProfile, "findUnique").mockResolvedValueOnce({
        id: MOCK_PROFILE_ID,
      } as any);
      // Chapter 2 is LOCKED in the investigation
      vi.spyOn(prisma.investigation, "findUnique").mockResolvedValueOnce(
        createMockInvestigation() as any
      );
      vi.spyOn(prisma.clue, "findUnique").mockResolvedValueOnce(
        createMockClue({
          id: MOCK_LOCKED_CLUE_ID,
          chapterId: MOCK_CHAPTER_ID_2, // Chapter 2 is locked!
        }) as any
      );

      await expect(
        EvidenceService.getEvidenceDetail(MOCK_USER_ID, MOCK_INVESTIGATION_ID, MOCK_LOCKED_CLUE_ID)
      ).rejects.toThrow("Evidence record not found or restricted");
    });

    it("should reject non-participants with 404 INVESTIGATION_NOT_FOUND to defeat existence probing", async () => {
      vi.spyOn(prisma.playerProfile, "findUnique").mockResolvedValueOnce({
        id: MOCK_OTHER_PROFILE_ID,
      } as any);
      vi.spyOn(prisma.investigation, "findUnique").mockResolvedValueOnce({
        ...createMockInvestigation(),
        participants: [], // User is not an active participant
      } as any);

      await expect(
        EvidenceService.getEvidenceDetail(MOCK_OTHER_USER_ID, MOCK_INVESTIGATION_ID, MOCK_CLUE_ID_1)
      ).rejects.toThrow("Investigation session not found or restricted");
    });
  });

  // =========================================================================
  // 3. Evidence Distribution & Provisioning
  // =========================================================================
  describe("Evidence Distribution Engine", () => {
    it("should provision ALL_PLAYERS clues to all active participants without duplicates", async () => {
      const mockTx = {
        clue: {
          findMany: vi.fn().mockResolvedValue([
            {
              id: MOCK_CLUE_ID_2,
              assignmentStrategy: ClueStrategy.ALL_PLAYERS,
            },
          ]),
        },
        clueAssignment: {
          findUnique: vi.fn().mockResolvedValue(null),
          create: vi.fn().mockResolvedValue({ id: "assign_new" }),
        },
        investigationParticipant: {
          findMany: vi.fn().mockResolvedValue([{ playerId: MOCK_PROFILE_ID }]),
        },
      };

      const count = await EvidenceService.provisionInvestigationClues(
        mockTx,
        MOCK_INVESTIGATION_ID,
        MOCK_CASE_ID,
        MOCK_CHAPTER_ID_1,
        [MOCK_PROFILE_ID]
      );

      expect(count).toBe(1);
      expect(mockTx.clueAssignment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            investigationId: MOCK_INVESTIGATION_ID,
            clueId: MOCK_CLUE_ID_2,
            playerId: MOCK_PROFILE_ID,
          }),
        })
      );
    });

    it("should prevent duplicate assignment creation when clue is already assigned", async () => {
      const mockTx = {
        clue: {
          findMany: vi.fn().mockResolvedValue([
            {
              id: MOCK_CLUE_ID_1,
              assignmentStrategy: ClueStrategy.ASYMMETRIC_EXCLUSIVE,
            },
          ]),
        },
        clueAssignment: {
          findUnique: vi.fn().mockResolvedValue({ id: "existing_assign" }), // Already exists
          findFirst: vi.fn().mockResolvedValue({ id: "existing_assign" }),
          create: vi.fn(),
        },
      };

      const count = await EvidenceService.provisionInvestigationClues(
        mockTx,
        MOCK_INVESTIGATION_ID,
        MOCK_CASE_ID,
        MOCK_CHAPTER_ID_1,
        [MOCK_PROFILE_ID]
      );

      expect(count).toBe(0);
      expect(mockTx.clueAssignment.create).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // 4. Evidence Sharing
  // =========================================================================
  describe("Evidence Sharing Protocol", () => {
    it("should allow an authorized operative to share eligible evidence with another squad member", async () => {
      vi.spyOn(prisma.playerProfile, "findUnique").mockResolvedValue({
        id: MOCK_PROFILE_ID,
      } as any);
      vi.spyOn(EvidenceService, "getEvidenceDetail").mockResolvedValueOnce({
        id: MOCK_CLUE_ID_1,
        isShareable: true,
      } as any);

      // Verify recipient is an active participant in this investigation
      vi.spyOn(prisma.investigationParticipant, "findFirst").mockResolvedValueOnce({
        id: "part_other",
        investigationId: MOCK_INVESTIGATION_ID,
        playerId: MOCK_OTHER_PROFILE_ID,
        player: { codename: "AGENT_RECIPIENT" },
      } as any);

      // No duplicate active share exists
      vi.spyOn(prisma.evidenceShare, "findFirst").mockResolvedValueOnce(null);

      // Sender's assignment
      vi.spyOn(prisma.clueAssignment, "findUnique").mockResolvedValueOnce({
        id: "assign_sender",
        investigationId: MOCK_INVESTIGATION_ID,
        clueId: MOCK_CLUE_ID_1,
      } as any);

      vi.spyOn(prisma.evidenceShare, "create").mockResolvedValueOnce({
        id: "share_123",
        sharedAt: new Date("2026-11-06T08:15:00Z"),
        sharingPlayer: { codename: "AGENT_LEAD" },
        recipientPlayer: { codename: "AGENT_RECIPIENT" },
      } as any);

      vi.spyOn(prisma.clueAssignment, "update").mockResolvedValueOnce({} as any);

      const shareResult = await EvidenceService.shareEvidence(
        MOCK_USER_ID,
        MOCK_INVESTIGATION_ID,
        MOCK_CLUE_ID_1,
        MOCK_OTHER_PROFILE_ID
      );

      expect(shareResult.id).toBe("share_123");
      expect(shareResult.sharingPlayerCodename).toBe("AGENT_LEAD");
      expect(shareResult.recipientPlayerCodename).toBe("AGENT_RECIPIENT");
    });

    it("should reject sharing unshareable evidence", async () => {
      vi.spyOn(prisma.playerProfile, "findUnique").mockResolvedValue({
        id: MOCK_PROFILE_ID,
      } as any);
      vi.spyOn(EvidenceService, "getEvidenceDetail").mockResolvedValueOnce({
        id: MOCK_CLUE_ID_1,
        isShareable: false, // Non-shareable!
      } as any);

      await expect(
        EvidenceService.shareEvidence(
          MOCK_USER_ID,
          MOCK_INVESTIGATION_ID,
          MOCK_CLUE_ID_1,
          MOCK_OTHER_PROFILE_ID
        )
      ).rejects.toThrow("marked non-shareable");
    });

    it("should reject sharing with a user outside the investigation", async () => {
      vi.spyOn(prisma.playerProfile, "findUnique").mockResolvedValue({
        id: MOCK_PROFILE_ID,
      } as any);
      vi.spyOn(EvidenceService, "getEvidenceDetail").mockResolvedValueOnce({
        id: MOCK_CLUE_ID_1,
        isShareable: true,
      } as any);

      // Recipient not in investigation
      vi.spyOn(prisma.investigationParticipant, "findFirst").mockResolvedValueOnce(null);

      await expect(
        EvidenceService.shareEvidence(
          MOCK_USER_ID,
          MOCK_INVESTIGATION_ID,
          MOCK_CLUE_ID_1,
          "00000000-0000-4000-a000-000000000099"
        )
      ).rejects.toThrow("Recipient is not an active operative in this investigation");
    });

    it("should reject duplicate active sharing to the same recipient", async () => {
      vi.spyOn(prisma.playerProfile, "findUnique").mockResolvedValue({
        id: MOCK_PROFILE_ID,
      } as any);
      vi.spyOn(EvidenceService, "getEvidenceDetail").mockResolvedValueOnce({
        id: MOCK_CLUE_ID_1,
        isShareable: true,
      } as any);

      vi.spyOn(prisma.investigationParticipant, "findFirst").mockResolvedValueOnce({
        id: "part_other",
        playerId: MOCK_OTHER_PROFILE_ID,
      } as any);

      // Duplicate active share exists!
      vi.spyOn(prisma.evidenceShare, "findFirst").mockResolvedValueOnce({
        id: "existing_share",
      } as any);

      await expect(
        EvidenceService.shareEvidence(
          MOCK_USER_ID,
          MOCK_INVESTIGATION_ID,
          MOCK_CLUE_ID_1,
          MOCK_OTHER_PROFILE_ID
        )
      ).rejects.toThrow("This intelligence has already been shared");
    });
  });

  // =========================================================================
  // 5. Private Field Notes
  // =========================================================================
  describe("Private Investigation Notes", () => {
    it("should create and edit private notes strictly scoped to the operative and investigation", async () => {
      vi.spyOn(prisma.playerProfile, "findUnique").mockResolvedValue({
        id: MOCK_PROFILE_ID,
      } as any);
      vi.spyOn(EvidenceService, "getEvidenceDetail").mockResolvedValueOnce({
        id: MOCK_CLUE_ID_1,
      } as any);

      const upsertSpy = vi.spyOn(prisma.evidenceNote, "upsert").mockResolvedValueOnce({
        id: "note_123",
        investigationId: MOCK_INVESTIGATION_ID,
        clueId: MOCK_CLUE_ID_1,
        playerId: MOCK_PROFILE_ID,
        content: "Telemetry timestamps show power cuts occurred before the comm line was severed.",
        createdAt: new Date(),
        updatedAt: new Date("2026-11-06T08:30:00Z"),
      } as any);

      const note = await EvidenceService.saveEvidenceNote(
        MOCK_USER_ID,
        MOCK_INVESTIGATION_ID,
        MOCK_CLUE_ID_1,
        "Telemetry timestamps show power cuts occurred before the comm line was severed."
      );

      expect(note.id).toBe("note_123");
      expect(note.content).toContain("Telemetry timestamps");
      expect(upsertSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            investigationId_clueId_playerId: {
              investigationId: MOCK_INVESTIGATION_ID,
              clueId: MOCK_CLUE_ID_1,
              playerId: MOCK_PROFILE_ID,
            },
          },
        })
      );
    });

    it("should reject empty or whitespace-only field notes", async () => {
      vi.spyOn(prisma.playerProfile, "findUnique").mockResolvedValue({
        id: MOCK_PROFILE_ID,
      } as any);
      vi.spyOn(EvidenceService, "getEvidenceDetail").mockResolvedValueOnce({
        id: MOCK_CLUE_ID_1,
      } as any);

      await expect(
        EvidenceService.saveEvidenceNote(MOCK_USER_ID, MOCK_INVESTIGATION_ID, MOCK_CLUE_ID_1, "   ")
      ).rejects.toThrow("Note content cannot be empty");
    });
  });

  // =========================================================================
  // 6. REST API Route Handlers
  // =========================================================================
  describe("Evidence API Routes", () => {
    it("GET /api/investigations/[investigationId]/evidence should return HTTP 200 with evidence listing", async () => {
      vi.spyOn(EvidenceService, "getInvestigationEvidence").mockResolvedValueOnce({
        items: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 1,
      });

      const req = new NextRequest(
        `http://localhost:3000/api/investigations/${MOCK_INVESTIGATION_ID}/evidence?scope=ALL`
      );
      const res = await getEvidenceListRoute(req, {
        params: Promise.resolve({ investigationId: MOCK_INVESTIGATION_ID }),
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(json.data.items).toEqual([]);
    });

    it("GET /api/investigations/[investigationId]/evidence/[evidenceId] should return HTTP 200 with details", async () => {
      vi.spyOn(EvidenceService, "getEvidenceDetail").mockResolvedValueOnce({
        id: MOCK_CLUE_ID_1,
        title: "Zurich Server Terminal Log",
      } as any);

      const req = new NextRequest(
        `http://localhost:3000/api/investigations/${MOCK_INVESTIGATION_ID}/evidence/${MOCK_CLUE_ID_1}`
      );
      const res = await getEvidenceDetailRoute(req, {
        params: Promise.resolve({
          investigationId: MOCK_INVESTIGATION_ID,
          evidenceId: MOCK_CLUE_ID_1,
        }),
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(json.data.id).toBe(MOCK_CLUE_ID_1);
    });

    it("POST /api/investigations/[investigationId]/evidence/[evidenceId]/notes should create private note", async () => {
      vi.spyOn(EvidenceService, "saveEvidenceNote").mockResolvedValueOnce({
        id: "note_1",
        content: "Verified terminal access logs.",
        updatedAt: new Date().toISOString(),
      });

      const req = new NextRequest(
        `http://localhost:3000/api/investigations/${MOCK_INVESTIGATION_ID}/evidence/${MOCK_CLUE_ID_1}/notes`,
        {
          method: "POST",
          body: JSON.stringify({ content: "Verified terminal access logs." }),
        }
      );
      const res = await saveEvidenceNoteRoute(req, {
        params: Promise.resolve({
          investigationId: MOCK_INVESTIGATION_ID,
          evidenceId: MOCK_CLUE_ID_1,
        }),
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(json.data.id).toBe("note_1");
    });

    it("POST /api/investigations/[investigationId]/evidence/[evidenceId]/share should share evidence", async () => {
      vi.spyOn(EvidenceService, "shareEvidence").mockResolvedValueOnce({
        id: "share_1",
        sharedAt: new Date().toISOString(),
        sharingPlayerCodename: "AGENT_LEAD",
        recipientPlayerCodename: "AGENT_OTHER",
        isMine: true,
      });

      const req = new NextRequest(
        `http://localhost:3000/api/investigations/${MOCK_INVESTIGATION_ID}/evidence/${MOCK_CLUE_ID_1}/share`,
        {
          method: "POST",
          body: JSON.stringify({ recipientPlayerId: MOCK_OTHER_PROFILE_ID }),
        }
      );
      const res = await shareEvidenceRoute(req, {
        params: Promise.resolve({
          investigationId: MOCK_INVESTIGATION_ID,
          evidenceId: MOCK_CLUE_ID_1,
        }),
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(json.data.id).toBe("share_1");
    });

    it("DELETE /api/investigations/[investigationId]/evidence/[evidenceId]/notes should delete private note", async () => {
      vi.spyOn(EvidenceService, "deleteEvidenceNote").mockResolvedValueOnce();

      const req = new NextRequest(
        `http://localhost:3000/api/investigations/${MOCK_INVESTIGATION_ID}/evidence/${MOCK_CLUE_ID_1}/notes`,
        { method: "DELETE" }
      );
      const res = await deleteEvidenceNoteRoute(req, {
        params: Promise.resolve({
          investigationId: MOCK_INVESTIGATION_ID,
          evidenceId: MOCK_CLUE_ID_1,
        }),
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(json.message).toContain("deleted successfully");
    });

    it("DELETE /api/investigations/[investigationId]/evidence/[evidenceId]/share/[shareId] should revoke share", async () => {
      vi.spyOn(EvidenceService, "revokeEvidenceShare").mockResolvedValueOnce();

      const req = new NextRequest(
        `http://localhost:3000/api/investigations/${MOCK_INVESTIGATION_ID}/evidence/${MOCK_CLUE_ID_1}/share/share_123`,
        { method: "DELETE" }
      );
      const res = await revokeEvidenceShareRoute(req, {
        params: Promise.resolve({
          investigationId: MOCK_INVESTIGATION_ID,
          evidenceId: MOCK_CLUE_ID_1,
          shareId: "share_123",
        }),
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(json.message).toContain("revoked successfully");
    });

    it("GET /api/investigations/[investigationId]/evidence/[evidenceId]/assets/[assetId] should return 404 ASSET_FILE_NOT_FOUND when binary file is missing from local storage", async () => {
      vi.spyOn(EvidenceService, "getEvidenceAsset").mockResolvedValueOnce({
        asset: {
          id: "asset_test_1",
          fileName: "server_log.png",
          mimeType: "image/png",
          storageKey: "evidence/CASE-001/CLUE-001/missing_file.png",
        },
      } as any);

      const req = new NextRequest(
        `http://localhost:3000/api/investigations/${MOCK_INVESTIGATION_ID}/evidence/${MOCK_CLUE_ID_1}/assets/asset_test_1`
      );
      const res = await getEvidenceAssetRoute(req, {
        params: Promise.resolve({
          investigationId: MOCK_INVESTIGATION_ID,
          evidenceId: MOCK_CLUE_ID_1,
          assetId: "asset_test_1",
        }),
      });

      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.code).toBe("ASSET_FILE_NOT_FOUND");
    });
  });

  // =========================================================================
  // 7. Architectural Audit Scenarios (Audits 1, 2, 3, 4)
  // =========================================================================
  describe("Architectural Audit Verification", () => {
    // AUDIT 1: Late participant provisioning & asymmetric isolation
    it("should provision ALL_PLAYERS to late-joining operative without granting exclusive clues already held by another", async () => {
      const allPlayersClue = createMockClue({
        id: "clue_all_players",
        assignmentStrategy: ClueStrategy.ALL_PLAYERS,
      });
      const exclusiveClue = createMockClue({
        id: "clue_exclusive",
        assignmentStrategy: ClueStrategy.ASYMMETRIC_EXCLUSIVE,
      });

      const mockDb = {
        clue: {
          findMany: vi.fn().mockResolvedValue([allPlayersClue, exclusiveClue]),
        },
        clueAssignment: {
          findUnique: vi.fn().mockResolvedValue(null), // For ALL_PLAYERS clue: player 2 has not received it yet
          findFirst: vi.fn().mockResolvedValue({
            // For exclusive clue: ALREADY assigned to player 1!
            id: "assignment_p1",
            playerId: MOCK_PROFILE_ID,
          }),
          create: vi.fn().mockResolvedValue({ id: "new_assignment" }),
        },
      };

      // Provision for late-joining player 2
      const createdCount = await EvidenceService.provisionInvestigationClues(
        mockDb,
        MOCK_INVESTIGATION_ID,
        MOCK_CASE_ID,
        MOCK_CHAPTER_ID_1,
        [MOCK_OTHER_PROFILE_ID]
      );

      // Only ALL_PLAYERS clue should have been assigned (createdCount = 1)
      expect(createdCount).toBe(1);
      expect(mockDb.clueAssignment.create).toHaveBeenCalledTimes(1);
      expect(mockDb.clueAssignment.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          clueId: "clue_all_players",
          playerId: MOCK_OTHER_PROFILE_ID,
        }),
      });
    });

    // AUDIT 1: Repeated provisioning idempotency
    it("should handle repeated provisioning calls without creating duplicate assignments", async () => {
      const allPlayersClue = createMockClue({
        id: "clue_all_players",
        assignmentStrategy: ClueStrategy.ALL_PLAYERS,
      });

      const mockDb = {
        clue: {
          findMany: vi.fn().mockResolvedValue([allPlayersClue]),
        },
        clueAssignment: {
          findUnique: vi.fn().mockResolvedValue({ id: "already_exists" }), // already assigned
          create: vi.fn(),
        },
      };

      const createdCount = await EvidenceService.provisionInvestigationClues(
        mockDb,
        MOCK_INVESTIGATION_ID,
        MOCK_CASE_ID,
        MOCK_CHAPTER_ID_1,
        [MOCK_PROFILE_ID]
      );

      expect(createdCount).toBe(0);
      expect(mockDb.clueAssignment.create).not.toHaveBeenCalled();
    });

    // AUDIT 4: Revocation denies access
    it("should deny clue access when the evidence share has been revoked", async () => {
      vi.spyOn(prisma.playerProfile, "findUnique").mockResolvedValue({
        id: MOCK_OTHER_PROFILE_ID, // Recipient
      } as any);

      const mockInv = createMockInvestigation({
        participants: [
          {
            id: "part_recipient",
            investigationId: MOCK_INVESTIGATION_ID,
            playerId: MOCK_OTHER_PROFILE_ID,
            status: ParticipantStatus.ACTIVE,
          },
        ],
      });
      vi.spyOn(prisma.investigation, "findUnique").mockResolvedValue(mockInv as any);

      // Clue is exclusive
      const clue = createMockClue({
        assignmentStrategy: ClueStrategy.ASYMMETRIC_EXCLUSIVE,
      });
      vi.spyOn(prisma.clue, "findUnique").mockResolvedValue(clue as any);

      // No direct assignment for recipient
      vi.spyOn(prisma.clueAssignment, "findUnique").mockResolvedValue(null);

      // Share exists BUT was REVOKED (revokedAt is checked by findFirst)
      vi.spyOn(prisma.evidenceShare, "findFirst").mockResolvedValue(null);

      await expect(
        EvidenceService.getEvidenceDetail(MOCK_OTHER_USER_ID, MOCK_INVESTIGATION_ID, clue.id)
      ).rejects.toThrow("Evidence record not found or restricted");
    });

    // AUDIT 4: Locked clue cannot be accessed even if share record exists
    it("should reject evidence detail for a shared clue if its chapter is still locked in the investigation", async () => {
      vi.spyOn(prisma.playerProfile, "findUnique").mockResolvedValue({
        id: MOCK_OTHER_PROFILE_ID,
      } as any);

      // Investigation has chapter 2 LOCKED
      const mockInv = createMockInvestigation();
      vi.spyOn(prisma.investigation, "findUnique").mockResolvedValue(mockInv as any);

      // Clue belongs to locked chapter 2
      const lockedClue = createMockClue({
        chapterId: MOCK_CHAPTER_ID_2,
      });
      vi.spyOn(prisma.clue, "findUnique").mockResolvedValue(lockedClue as any);

      await expect(
        EvidenceService.getEvidenceDetail(MOCK_OTHER_USER_ID, MOCK_INVESTIGATION_ID, lockedClue.id)
      ).rejects.toThrow("Evidence record not found or restricted");
    });

    // AUDIT 4: Re-sharing by recipient (indirect access) is rejected
    it("should reject evidence sharing by an operative who only received it via a previous share", async () => {
      vi.spyOn(prisma.playerProfile, "findUnique").mockResolvedValue({
        id: MOCK_OTHER_PROFILE_ID,
      } as any);

      // getEvidenceDetail returns accessType: "SHARED" (indirect)
      vi.spyOn(EvidenceService, "getEvidenceDetail").mockResolvedValueOnce({
        id: MOCK_CLUE_ID_1,
        isShareable: true,
        accessType: "SHARED", // Operative only has shared access!
      } as any);

      await expect(
        EvidenceService.shareEvidence(
          MOCK_OTHER_USER_ID,
          MOCK_INVESTIGATION_ID,
          MOCK_CLUE_ID_1,
          "00000000-0000-4000-a000-000000000099"
        )
      ).rejects.toThrow("Only operatives with direct assignment or clearance may share");
    });

    // AUDIT 4: RevokeEvidenceShare rejects unauthorized callers
    it("should reject revokeEvidenceShare if caller is not the sharing operative", async () => {
      vi.spyOn(prisma.playerProfile, "findUnique").mockResolvedValue({
        id: MOCK_OTHER_PROFILE_ID, // not the sender
      } as any);

      const mockInv = createMockInvestigation({
        participants: [
          {
            id: "part_other",
            investigationId: MOCK_INVESTIGATION_ID,
            playerId: MOCK_OTHER_PROFILE_ID,
            status: ParticipantStatus.ACTIVE,
          },
        ],
      });
      vi.spyOn(prisma.investigation, "findUnique").mockResolvedValue(mockInv as any);

      vi.spyOn(prisma.evidenceShare, "findUnique").mockResolvedValue({
        id: "share_123",
        investigationId: MOCK_INVESTIGATION_ID,
        sharingPlayerId: MOCK_PROFILE_ID, // Shared by lead operative, not other
        revokedAt: null,
      } as any);

      await expect(
        EvidenceService.revokeEvidenceShare(
          MOCK_OTHER_USER_ID,
          MOCK_INVESTIGATION_ID,
          "00000000-0000-4000-a000-000000000088"
        )
      ).rejects.toThrow("Only the operative who shared this intelligence may revoke it");
    });

    // AUDIT 2: Private note isolation after sharing
    it("should ensure private notes remain strictly isolated when evidence is shared", async () => {
      vi.spyOn(prisma.playerProfile, "findUnique").mockResolvedValue({
        id: MOCK_OTHER_PROFILE_ID, // Recipient viewing shared clue
      } as any);

      const mockInv = createMockInvestigation({
        participants: [
          {
            id: "part_recipient",
            investigationId: MOCK_INVESTIGATION_ID,
            playerId: MOCK_OTHER_PROFILE_ID,
            status: ParticipantStatus.ACTIVE,
          },
        ],
      });
      vi.spyOn(prisma.investigation, "findUnique").mockResolvedValue(mockInv as any);

      const clue = createMockClue({
        assignmentStrategy: ClueStrategy.ASYMMETRIC_EXCLUSIVE,
      });
      vi.spyOn(prisma.clue, "findUnique").mockResolvedValue(clue as any);
      vi.spyOn(prisma.clueAssignment, "findUnique").mockResolvedValue(null);

      // Active share from lead operative to other operative
      vi.spyOn(prisma.evidenceShare, "findFirst").mockResolvedValue({
        id: "share_123",
        sharedAt: new Date(),
      } as any);

      // The findUnique for privateNote must query with recipient's profile ID
      const noteSpy = vi.spyOn(prisma.evidenceNote, "findUnique").mockResolvedValue(null);

      const detail = await EvidenceService.getEvidenceDetail(
        MOCK_OTHER_USER_ID,
        MOCK_INVESTIGATION_ID,
        clue.id
      );

      // Recipient has access via SHARED
      expect(detail.accessType).toBe("SHARED");
      // But recipient sees NO note from the sharer!
      expect(detail.myNote).toBeNull();
      // Verified note query was bound to recipient's profile ID
      expect(noteSpy).toHaveBeenCalledWith({
        where: {
          investigationId_clueId_playerId: {
            investigationId: MOCK_INVESTIGATION_ID,
            clueId: clue.id,
            playerId: MOCK_OTHER_PROFILE_ID,
          },
        },
      });
    });

    // AUDIT 2: Note deletion removes the operative's note
    it("should successfully delete an operative's private note", async () => {
      vi.spyOn(prisma.playerProfile, "findUnique").mockResolvedValue({
        id: MOCK_PROFILE_ID,
      } as any);
      vi.spyOn(EvidenceService, "getEvidenceDetail").mockResolvedValueOnce({
        id: MOCK_CLUE_ID_1,
      } as any);

      vi.spyOn(prisma.evidenceNote, "findUnique").mockResolvedValueOnce({
        id: "note_to_delete",
      } as any);
      const deleteSpy = vi.spyOn(prisma.evidenceNote, "delete").mockResolvedValueOnce({
        id: "note_to_delete",
      } as any);

      await EvidenceService.deleteEvidenceNote(MOCK_USER_ID, MOCK_INVESTIGATION_ID, MOCK_CLUE_ID_1);

      expect(deleteSpy).toHaveBeenCalledWith({
        where: { id: "note_to_delete" },
      });
    });

    // AUDIT 3: Unauthorized asset streaming returns 404
    it("should reject getEvidenceAsset when operative does not have access to the clue", async () => {
      vi.spyOn(EvidenceService, "getEvidenceDetail").mockRejectedValueOnce(
        new AppError("Evidence record not found or restricted", 404, "EVIDENCE_NOT_FOUND")
      );

      await expect(
        EvidenceService.getEvidenceAsset(
          MOCK_USER_ID,
          MOCK_INVESTIGATION_ID,
          MOCK_CLUE_ID_1,
          "00000000-0000-4000-a000-000000000077"
        )
      ).rejects.toThrow("Evidence record not found or restricted");
    });
  });
});
