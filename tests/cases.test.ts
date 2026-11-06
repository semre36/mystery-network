import { describe, it, expect, vi, beforeEach } from "vitest";
import { CaseService } from "@/modules/cases/services/case.service";
import { CaseQuerySchema } from "@/modules/cases/validation/case-query.schema";
import { GET as getCasesRoute } from "@/app/api/cases/route";
import { GET as getCaseDetailRoute } from "@/app/api/cases/[caseId]/route";
import { GET as getCampaignsRoute } from "@/app/api/campaigns/route";
import { GET as getCampaignDetailRoute } from "@/app/api/campaigns/[slug]/route";
import { prisma } from "@/server/infrastructure/database";
import { AppError } from "@/lib/errors/app-error";
import { CaseDifficulty, ContentStatus, PlayMode } from "@prisma/client";
import { NextRequest } from "next/server";

describe("Case Management & Discovery System (Phase 06)", () => {
  const MOCK_CAMPAIGN_ID = "00000000-0000-4000-b000-000000000001";
  const MOCK_CASE_ID = "00000000-0000-4000-b000-000000000002";
  const MOCK_CHAPTER_ID_1 = "00000000-0000-4000-b000-000000000003";
  const MOCK_CHAPTER_ID_2 = "00000000-0000-4000-b000-000000000004";
  const MOCK_CHARACTER_ID = "00000000-0000-4000-b000-000000000005";

  const mockDbCampaign = {
    id: MOCK_CAMPAIGN_ID,
    slug: "project-midnight",
    title: "Project Midnight",
    description: "A clandestine investigation into cyber espionage and telemetry manipulation.",
    coverImageUrl: null,
    status: ContentStatus.PUBLISHED,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    _count: {
      cases: 1,
    },
  };

  const mockDbCase = {
    id: MOCK_CASE_ID,
    caseCode: "CASE-001-MIDNIGHT-PROTOCOL",
    campaignId: MOCK_CAMPAIGN_ID,
    title: "The Midnight Protocol",
    description: "An encrypted relay in Zurich was silenced under mysterious circumstances.",
    difficulty: CaseDifficulty.MEDIUM,
    estimatedDurationMinutes: 45,
    minPlayers: 1,
    maxPlayers: 4,
    supportedPlayModes: [PlayMode.SOLO, PlayMode.COOPERATIVE],
    status: ContentStatus.PUBLISHED,
    publishedAt: new Date("2026-01-15T00:00:00Z"),
    createdAt: new Date("2026-01-15T00:00:00Z"),
    updatedAt: new Date("2026-01-15T00:00:00Z"),
    campaign: {
      id: MOCK_CAMPAIGN_ID,
      slug: "project-midnight",
      title: "Project Midnight",
      description: "A clandestine investigation into cyber espionage and telemetry manipulation.",
      coverImageUrl: null,
      status: ContentStatus.PUBLISHED,
      _count: {
        cases: 1,
      },
    },
    chapters: [
      {
        id: MOCK_CHAPTER_ID_1,
        chapterOrder: 1,
        title: "Act 1: The Zurich Blackout",
        description: "Analyze the initial telemetry and determine the vector of infiltration.",
        status: ContentStatus.PUBLISHED,
      },
      {
        id: MOCK_CHAPTER_ID_2,
        chapterOrder: 2,
        title: "Act 2: Echoes in the Static",
        description: "Cross-reference access logs with emergency power grid signatures.",
        status: ContentStatus.PUBLISHED,
      },
    ],
    characters: [
      {
        id: MOCK_CHARACTER_ID,
        name: "Dr. Elena Vance",
        description: "Senior telecommunications specialist stationed at Zurich Relay 7.",
        metadata: {
          role: "Chief Systems Architect",
          clearance: "TOP SECRET",
          location: "Zurich, Switzerland",
          _privateSecretKey: "classified-vault-passcode-never-leak", // Should be strictly omitted
        },
      },
    ],
    _count: {
      chapters: 2,
      characters: 1,
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =========================================================================
  // 1. Query Validation Schema Tests
  // =========================================================================
  describe("CaseQuerySchema Validation", () => {
    it("should accept empty query and supply default parameters", () => {
      const parsed = CaseQuerySchema.safeParse({});
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.page).toBe(1);
        expect(parsed.data.limit).toBe(12);
        expect(parsed.data.sortBy).toBe("newest");
        expect(parsed.data.search).toBeUndefined();
        expect(parsed.data.difficulty).toBeUndefined();
      }
    });

    it("should parse and sanitize valid query parameters", () => {
      const parsed = CaseQuerySchema.safeParse({
        search: "   midnight protocol   ",
        difficulty: "HARD",
        campaignSlug: "project-midnight",
        sortBy: "difficulty",
        page: "2",
        limit: "24",
      });

      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.search).toBe("midnight protocol");
        expect(parsed.data.difficulty).toBe(CaseDifficulty.HARD);
        expect(parsed.data.campaignSlug).toBe("project-midnight");
        expect(parsed.data.sortBy).toBe("difficulty");
        expect(parsed.data.page).toBe(2);
        expect(parsed.data.limit).toBe(24);
      }
    });

    it("should reject invalid difficulty tier", () => {
      const parsed = CaseQuerySchema.safeParse({
        difficulty: "IMPOSSIBLE",
      });
      expect(parsed.success).toBe(false);
    });

    it("should reject negative or zero page number", () => {
      const parsed = CaseQuerySchema.safeParse({ page: "0" });
      expect(parsed.success).toBe(false);
    });

    it("should reject limit exceeding maximum allowable threshold (50)", () => {
      const parsed = CaseQuerySchema.safeParse({ limit: "100" });
      expect(parsed.success).toBe(false);
    });

    it("should reject search queries exceeding 100 characters", () => {
      const parsed = CaseQuerySchema.safeParse({ search: "a".repeat(101) });
      expect(parsed.success).toBe(false);
    });
  });

  // =========================================================================
  // 2. CaseService.getPublishedCases Tests
  // =========================================================================
  describe("CaseService.getPublishedCases", () => {
    it("should retrieve paginated published cases and map them to SafeCaseSummaryDto", async () => {
      vi.spyOn(prisma.case, "findMany").mockResolvedValueOnce([mockDbCase as any]);
      vi.spyOn(prisma.case, "count").mockResolvedValueOnce(1);

      const response = await CaseService.getPublishedCases({ page: 1, limit: 12 });

      expect(response.total).toBe(1);
      expect(response.page).toBe(1);
      expect(response.limit).toBe(12);
      expect(response.totalPages).toBe(1);
      expect(response.hasMore).toBe(false);
      expect(response.items).toHaveLength(1);

      const caseItem = response.items[0];
      expect(caseItem.id).toBe(MOCK_CASE_ID);
      expect(caseItem.caseCode).toBe("CASE-001-MIDNIGHT-PROTOCOL");
      expect(caseItem.title).toBe("The Midnight Protocol");
      expect(caseItem.difficulty).toBe(CaseDifficulty.MEDIUM);
      expect(caseItem.status).toBe(ContentStatus.PUBLISHED);
      expect(caseItem.chapterCount).toBe(2);
      expect(caseItem.characterCount).toBe(1);
      expect(caseItem.isFeatured).toBe(true);
      expect(caseItem.campaign?.slug).toBe("project-midnight");
    });

    it("should enforce ContentStatus.PUBLISHED in Prisma query filter", async () => {
      const findManySpy = vi.spyOn(prisma.case, "findMany").mockResolvedValueOnce([]);
      const countSpy = vi.spyOn(prisma.case, "count").mockResolvedValueOnce(0);

      await CaseService.getPublishedCases({ difficulty: CaseDifficulty.EXPERT });

      expect(findManySpy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: ContentStatus.PUBLISHED,
            difficulty: CaseDifficulty.EXPERT,
          }),
        })
      );
      expect(countSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: ContentStatus.PUBLISHED,
          }),
        })
      );
    });

    it("should apply search term across title, code, description, and campaign title", async () => {
      const findManySpy = vi.spyOn(prisma.case, "findMany").mockResolvedValueOnce([]);
      vi.spyOn(prisma.case, "count").mockResolvedValueOnce(0);

      await CaseService.getPublishedCases({ search: "Zurich" });

      expect(findManySpy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: ContentStatus.PUBLISHED,
            OR: [
              { title: { contains: "Zurich", mode: "insensitive" } },
              { caseCode: { contains: "Zurich", mode: "insensitive" } },
              { description: { contains: "Zurich", mode: "insensitive" } },
              {
                campaign: {
                  title: { contains: "Zurich", mode: "insensitive" },
                  status: ContentStatus.PUBLISHED,
                },
              },
            ],
          }),
        })
      );
    });

    it("should correctly handle sort ordering (title, oldest, difficulty)", async () => {
      const findManySpy = vi.spyOn(prisma.case, "findMany").mockResolvedValue([]);
      vi.spyOn(prisma.case, "count").mockResolvedValue(0);

      await CaseService.getPublishedCases({ sortBy: "title" });
      expect(findManySpy).toHaveBeenLastCalledWith(
        expect.objectContaining({
          orderBy: [{ title: "asc" }],
        })
      );

      await CaseService.getPublishedCases({ sortBy: "oldest" });
      expect(findManySpy).toHaveBeenLastCalledWith(
        expect.objectContaining({
          orderBy: [{ publishedAt: "asc" }, { createdAt: "asc" }],
        })
      );

      await CaseService.getPublishedCases({ sortBy: "difficulty" });
      expect(findManySpy).toHaveBeenLastCalledWith(
        expect.objectContaining({
          orderBy: [{ difficulty: "asc" }, { publishedAt: "desc" }],
        })
      );
    });
  });

  // =========================================================================
  // 3. CaseService.getCaseByIdOrCode Tests
  // =========================================================================
  describe("CaseService.getCaseByIdOrCode", () => {
    it("should look up a case by caseCode and return sanitized SafeCaseDetailDto", async () => {
      vi.spyOn(prisma.case, "findFirst").mockResolvedValueOnce(mockDbCase as any);

      const result = await CaseService.getCaseByIdOrCode("CASE-001-MIDNIGHT-PROTOCOL");

      expect(result).toBeDefined();
      expect(result.id).toBe(MOCK_CASE_ID);
      expect(result.caseCode).toBe("CASE-001-MIDNIGHT-PROTOCOL");
      expect(result.title).toBe("The Midnight Protocol");
      expect(result.chapters).toHaveLength(2);
      expect(result.characters).toHaveLength(1);

      // Verify Chapter 1 is unlocked for briefing, while Chapter 2 is progression locked
      expect(result.chapters[0].isLocked).toBe(false);
      expect(result.chapters[1].isLocked).toBe(true);

      // Verify Character sanitization (metadata whitelist)
      const character = result.characters[0];
      expect(character.name).toBe("Dr. Elena Vance");
      expect(character.role).toBe("Chief Systems Architect");
      expect(character.clearance).toBe("TOP SECRET");
      expect(character.location).toBe("Zurich, Switzerland");
      expect((character as any)._privateSecretKey).toBeUndefined();

      // Verify zero exposure of clues, puzzles, or scoring rules
      expect((result as any).clues).toBeUndefined();
      expect((result as any).puzzles).toBeUndefined();
      expect((result as any).solutionHash).toBeUndefined();
    });

    it("should look up a case by UUID format identifier", async () => {
      const findFirstSpy = vi
        .spyOn(prisma.case, "findFirst")
        .mockResolvedValueOnce(mockDbCase as any);

      await CaseService.getCaseByIdOrCode(MOCK_CASE_ID);

      expect(findFirstSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: MOCK_CASE_ID,
            status: ContentStatus.PUBLISHED,
          }),
        })
      );
    });

    it("should throw 404 CASE_NOT_FOUND if case is missing or not published", async () => {
      vi.spyOn(prisma.case, "findFirst").mockResolvedValueOnce(null);

      try {
        await CaseService.getCaseByIdOrCode("CASE-NON-EXISTENT");
        expect.unreachable("Expected getCaseByIdOrCode to throw");
      } catch (err) {
        expect(err).toBeInstanceOf(AppError);
        expect((err as AppError).statusCode).toBe(404);
        expect((err as AppError).code).toBe("CASE_NOT_FOUND");
      }
    });

    it("should throw 400 INVALID_CASE_IDENTIFIER for empty identifier", async () => {
      try {
        await CaseService.getCaseByIdOrCode("   ");
        expect.unreachable("Expected getCaseByIdOrCode to throw");
      } catch (err) {
        expect(err).toBeInstanceOf(AppError);
        expect((err as AppError).statusCode).toBe(400);
        expect((err as AppError).code).toBe("INVALID_CASE_IDENTIFIER");
      }
    });
  });

  // =========================================================================
  // 4. CaseService.getFeaturedCase Tests
  // =========================================================================
  describe("CaseService.getFeaturedCase", () => {
    it("should return the benchmark case CASE-001-MIDNIGHT-PROTOCOL when available", async () => {
      vi.spyOn(prisma.case, "findFirst").mockResolvedValueOnce(mockDbCase as any);

      const featured = await CaseService.getFeaturedCase();

      expect(featured).not.toBeNull();
      expect(featured?.caseCode).toBe("CASE-001-MIDNIGHT-PROTOCOL");
      expect(featured?.isFeatured).toBe(true);
    });

    it("should fall back to newest published case if benchmark is not present", async () => {
      vi.spyOn(prisma.case, "findFirst")
        .mockResolvedValueOnce(null) // benchmark not found
        .mockResolvedValueOnce({
          ...mockDbCase,
          caseCode: "CASE-002-OPERATION-PHANTOM",
        } as any);

      const featured = await CaseService.getFeaturedCase();

      expect(featured).not.toBeNull();
      expect(featured?.caseCode).toBe("CASE-002-OPERATION-PHANTOM");
      expect(featured?.isFeatured).toBe(true);
    });

    it("should return null if no published cases exist in database", async () => {
      vi.spyOn(prisma.case, "findFirst").mockResolvedValueOnce(null).mockResolvedValueOnce(null);

      const featured = await CaseService.getFeaturedCase();
      expect(featured).toBeNull();
    });
  });

  // =========================================================================
  // 5. Campaigns Discovery Tests
  // =========================================================================
  describe("CaseService Campaigns Discovery", () => {
    it("getPublishedCampaigns should return published campaigns with case count", async () => {
      vi.spyOn(prisma.campaign, "findMany").mockResolvedValueOnce([mockDbCampaign as any]);

      const campaigns = await CaseService.getPublishedCampaigns();

      expect(campaigns).toHaveLength(1);
      expect(campaigns[0].id).toBe(MOCK_CAMPAIGN_ID);
      expect(campaigns[0].slug).toBe("project-midnight");
      expect(campaigns[0].caseCount).toBe(1);
      expect(campaigns[0].status).toBe(ContentStatus.PUBLISHED);
    });

    it("getCampaignBySlug should return published campaign detail with connected published cases", async () => {
      vi.spyOn(prisma.campaign, "findFirst").mockResolvedValueOnce({
        ...mockDbCampaign,
        cases: [mockDbCase],
      } as any);

      const campaign = await CaseService.getCampaignBySlug("project-midnight");

      expect(campaign).toBeDefined();
      expect(campaign.slug).toBe("project-midnight");
      expect(campaign.cases).toHaveLength(1);
      expect(campaign.cases[0].caseCode).toBe("CASE-001-MIDNIGHT-PROTOCOL");
    });

    it("getCampaignBySlug should throw 404 CAMPAIGN_NOT_FOUND when not found or unpublished", async () => {
      vi.spyOn(prisma.campaign, "findFirst").mockResolvedValueOnce(null);

      try {
        await CaseService.getCampaignBySlug("non-existent-campaign");
        expect.unreachable("Expected getCampaignBySlug to throw");
      } catch (err) {
        expect(err).toBeInstanceOf(AppError);
        expect((err as AppError).statusCode).toBe(404);
        expect((err as AppError).code).toBe("CAMPAIGN_NOT_FOUND");
      }
    });

    it("getCampaignBySlug should throw 400 INVALID_CAMPAIGN_SLUG for empty slug", async () => {
      try {
        await CaseService.getCampaignBySlug("   ");
        expect.unreachable("Expected getCampaignBySlug to throw");
      } catch (err) {
        expect(err).toBeInstanceOf(AppError);
        expect((err as AppError).statusCode).toBe(400);
        expect((err as AppError).code).toBe("INVALID_CAMPAIGN_SLUG");
      }
    });
  });

  // =========================================================================
  // 6. API Route Handlers Tests
  // =========================================================================
  describe("Case & Campaign API Route Handlers", () => {
    describe("GET /api/cases", () => {
      it("should return HTTP 200 with paginated case catalog", async () => {
        vi.spyOn(CaseService, "getPublishedCases").mockResolvedValueOnce({
          items: [mockDbCase as any],
          total: 1,
          page: 1,
          limit: 12,
          totalPages: 1,
          hasMore: false,
        });

        const req = new NextRequest("http://localhost:3000/api/cases?difficulty=MEDIUM&page=1");
        const res = await getCasesRoute(req);

        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.ok).toBe(true);
        expect(body.data.items).toHaveLength(1);
        expect(body.data.total).toBe(1);
      });

      it("should return HTTP 400 when invalid query parameters are supplied", async () => {
        const req = new NextRequest("http://localhost:3000/api/cases?difficulty=ULTRA_HARD");
        const res = await getCasesRoute(req);

        expect(res.status).toBe(400);
        const body = await res.json();
        expect(body.code).toBe("INVALID_QUERY_PARAMS");
      });
    });

    describe("GET /api/cases/[caseId]", () => {
      it("should return HTTP 200 with case dossier", async () => {
        vi.spyOn(CaseService, "getCaseByIdOrCode").mockResolvedValueOnce(mockDbCase as any);

        const req = new NextRequest("http://localhost:3000/api/cases/CASE-001-MIDNIGHT-PROTOCOL");
        const res = await getCaseDetailRoute(req, {
          params: Promise.resolve({ caseId: "CASE-001-MIDNIGHT-PROTOCOL" }),
        });

        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.ok).toBe(true);
        expect(body.data.caseCode).toBe("CASE-001-MIDNIGHT-PROTOCOL");
      });

      it("should return HTTP 404 when case dossier is not found", async () => {
        vi.spyOn(CaseService, "getCaseByIdOrCode").mockRejectedValueOnce(
          new AppError("Classified case dossier not found or restricted", 404, "CASE_NOT_FOUND")
        );

        const req = new NextRequest("http://localhost:3000/api/cases/UNKNOWN");
        const res = await getCaseDetailRoute(req, {
          params: Promise.resolve({ caseId: "UNKNOWN" }),
        });

        expect(res.status).toBe(404);
        const body = await res.json();
        expect(body.code).toBe("CASE_NOT_FOUND");
      });
    });

    describe("GET /api/campaigns", () => {
      it("should return HTTP 200 with published campaigns list", async () => {
        vi.spyOn(CaseService, "getPublishedCampaigns").mockResolvedValueOnce([
          mockDbCampaign as any,
        ]);

        const res = await getCampaignsRoute();

        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.ok).toBe(true);
        expect(body.data).toHaveLength(1);
        expect(body.data[0].slug).toBe("project-midnight");
      });
    });

    describe("GET /api/campaigns/[slug]", () => {
      it("should return HTTP 200 with campaign detail and connected cases", async () => {
        vi.spyOn(CaseService, "getCampaignBySlug").mockResolvedValueOnce({
          ...mockDbCampaign,
          cases: [mockDbCase],
        } as any);

        const req = new NextRequest("http://localhost:3000/api/campaigns/project-midnight");
        const res = await getCampaignDetailRoute(req, {
          params: Promise.resolve({ slug: "project-midnight" }),
        });

        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.ok).toBe(true);
        expect(body.data.slug).toBe("project-midnight");
      });

      it("should return HTTP 404 when campaign is not found", async () => {
        vi.spyOn(CaseService, "getCampaignBySlug").mockRejectedValueOnce(
          new AppError("Classified campaign not found or restricted", 404, "CAMPAIGN_NOT_FOUND")
        );

        const req = new NextRequest("http://localhost:3000/api/campaigns/UNKNOWN");
        const res = await getCampaignDetailRoute(req, {
          params: Promise.resolve({ slug: "UNKNOWN" }),
        });

        expect(res.status).toBe(404);
        const body = await res.json();
        expect(body.code).toBe("CAMPAIGN_NOT_FOUND");
      });
    });
  });
});
