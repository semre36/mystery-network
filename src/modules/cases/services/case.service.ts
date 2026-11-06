import { prisma } from "@/server/infrastructure/database";
import { ContentStatus, Prisma } from "@prisma/client";
import { AppError } from "@/lib/errors/app-error";
import { logger } from "@/lib/logger";
import type {
  SafeCaseSummaryDto,
  SafeCaseDetailDto,
  SafeCampaignSummaryDto,
  SafeCampaignDetailDto,
  SafeChapterDto,
  SafeCharacterDto,
  CaseQueryFilters,
  PaginatedResponse,
} from "../types/case.types";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export class CaseService {
  /**
   * Retrieves a paginated list of published cases according to filters, sorting, and search terms.
   * Internal draft/archived cases are strictly excluded.
   */
  public static async getPublishedCases(
    filters: CaseQueryFilters = {}
  ): Promise<PaginatedResponse<SafeCaseSummaryDto>> {
    const page = Math.max(1, filters.page ?? 1);
    const limit = Math.min(50, Math.max(1, filters.limit ?? 12));
    const skip = (page - 1) * limit;

    const where: Prisma.CaseWhereInput = {
      status: ContentStatus.PUBLISHED,
    };

    if (filters.difficulty) {
      where.difficulty = filters.difficulty;
    }

    if (filters.campaignSlug) {
      where.campaign = {
        slug: filters.campaignSlug,
        status: ContentStatus.PUBLISHED,
      };
    }

    if (filters.search && filters.search.trim().length > 0) {
      const searchTerm = filters.search.trim();
      where.OR = [
        { title: { contains: searchTerm, mode: "insensitive" } },
        { caseCode: { contains: searchTerm, mode: "insensitive" } },
        { description: { contains: searchTerm, mode: "insensitive" } },
        {
          campaign: {
            title: { contains: searchTerm, mode: "insensitive" },
            status: ContentStatus.PUBLISHED,
          },
        },
      ];
    }

    let orderBy: Prisma.CaseOrderByWithRelationInput[];
    switch (filters.sortBy) {
      case "oldest":
        orderBy = [{ publishedAt: "asc" }, { createdAt: "asc" }];
        break;
      case "title":
        orderBy = [{ title: "asc" }];
        break;
      case "difficulty":
        orderBy = [{ difficulty: "asc" }, { publishedAt: "desc" }];
        break;
      case "newest":
      default:
        orderBy = [{ publishedAt: "desc" }, { createdAt: "desc" }];
        break;
    }

    const [cases, total] = await Promise.all([
      prisma.case.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          campaign: {
            select: {
              id: true,
              slug: true,
              title: true,
            },
          },
          _count: {
            select: {
              chapters: {
                where: { status: ContentStatus.PUBLISHED },
              },
              characters: true,
            },
          },
        },
      }),
      prisma.case.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    const items: SafeCaseSummaryDto[] = cases.map((c) => ({
      id: c.id,
      caseCode: c.caseCode,
      title: c.title,
      description: c.description,
      difficulty: c.difficulty,
      estimatedDurationMinutes: c.estimatedDurationMinutes,
      minPlayers: c.minPlayers,
      maxPlayers: c.maxPlayers,
      supportedPlayModes: c.supportedPlayModes,
      status: c.status,
      publishedAt: c.publishedAt ? c.publishedAt.toISOString() : null,
      campaign: c.campaign
        ? {
            id: c.campaign.id,
            slug: c.campaign.slug,
            title: c.campaign.title,
          }
        : null,
      chapterCount: c._count.chapters,
      characterCount: c._count.characters,
      isFeatured: c.caseCode === "CASE-001-MIDNIGHT-PROTOCOL",
    }));

    return {
      items,
      total,
      page,
      limit,
      totalPages,
      hasMore: page < totalPages,
    };
  }

  /**
   * Retrieves a single published case by either UUID or caseCode.
   * Throws 404 CASE_NOT_FOUND if the case does not exist or is not PUBLISHED.
   * Clues, puzzles, secrets, and scoring data are strictly redacted.
   */
  public static async getCaseByIdOrCode(identifier: string): Promise<SafeCaseDetailDto> {
    const trimmed = identifier.trim();
    if (!trimmed) {
      throw new AppError("Invalid case identifier provided", 400, "INVALID_CASE_IDENTIFIER");
    }

    const isUuid = UUID_REGEX.test(trimmed);

    const where: Prisma.CaseWhereInput = {
      status: ContentStatus.PUBLISHED,
      ...(isUuid ? { id: trimmed } : { caseCode: { equals: trimmed, mode: "insensitive" } }),
    };

    const caseRecord = await prisma.case.findFirst({
      where,
      include: {
        campaign: {
          select: {
            id: true,
            slug: true,
            title: true,
            description: true,
            coverImageUrl: true,
            status: true,
            _count: {
              select: {
                cases: {
                  where: { status: ContentStatus.PUBLISHED },
                },
              },
            },
          },
        },
        chapters: {
          where: { status: ContentStatus.PUBLISHED },
          orderBy: { chapterOrder: "asc" },
          select: {
            id: true,
            chapterOrder: true,
            title: true,
            description: true,
            status: true,
          },
        },
        characters: {
          select: {
            id: true,
            name: true,
            description: true,
            metadata: true,
          },
        },
      },
    });

    if (!caseRecord) {
      throw new AppError("Classified case dossier not found or restricted", 404, "CASE_NOT_FOUND");
    }

    const safeChapters: SafeChapterDto[] = caseRecord.chapters.map((ch) => ({
      id: ch.id,
      chapterOrder: ch.chapterOrder,
      title: ch.title,
      description: ch.description,
      status: ch.status,
      isLocked: ch.chapterOrder > 1,
    }));

    const safeCharacters: SafeCharacterDto[] = caseRecord.characters.map((char) => {
      const meta =
        char.metadata && typeof char.metadata === "object"
          ? (char.metadata as Record<string, unknown>)
          : {};

      return {
        id: char.id,
        name: char.name,
        description: char.description,
        role: typeof meta.role === "string" ? meta.role : undefined,
        clearance: typeof meta.clearance === "string" ? meta.clearance : undefined,
        location: typeof meta.location === "string" ? meta.location : undefined,
      };
    });

    const campaignDetail: SafeCampaignSummaryDto | null = caseRecord.campaign
      ? {
          id: caseRecord.campaign.id,
          slug: caseRecord.campaign.slug,
          title: caseRecord.campaign.title,
          description: caseRecord.campaign.description,
          coverImageUrl: caseRecord.campaign.coverImageUrl,
          status: caseRecord.campaign.status,
          caseCount: caseRecord.campaign._count.cases,
        }
      : null;

    return {
      id: caseRecord.id,
      caseCode: caseRecord.caseCode,
      title: caseRecord.title,
      description: caseRecord.description,
      difficulty: caseRecord.difficulty,
      estimatedDurationMinutes: caseRecord.estimatedDurationMinutes,
      minPlayers: caseRecord.minPlayers,
      maxPlayers: caseRecord.maxPlayers,
      supportedPlayModes: caseRecord.supportedPlayModes,
      status: caseRecord.status,
      publishedAt: caseRecord.publishedAt ? caseRecord.publishedAt.toISOString() : null,
      campaign: caseRecord.campaign
        ? {
            id: caseRecord.campaign.id,
            slug: caseRecord.campaign.slug,
            title: caseRecord.campaign.title,
          }
        : null,
      chapterCount: safeChapters.length,
      characterCount: safeCharacters.length,
      isFeatured: caseRecord.caseCode === "CASE-001-MIDNIGHT-PROTOCOL",
      chapters: safeChapters,
      characters: safeCharacters,
      campaignDetail,
    };
  }

  /**
   * Retrieves the current featured case for banner promotion.
   * Prioritizes benchmark CASE-001-MIDNIGHT-PROTOCOL, then newest published case.
   */
  public static async getFeaturedCase(): Promise<SafeCaseSummaryDto | null> {
    // 1. Try finding CASE-001-MIDNIGHT-PROTOCOL
    let caseRecord = await prisma.case.findFirst({
      where: {
        caseCode: "CASE-001-MIDNIGHT-PROTOCOL",
        status: ContentStatus.PUBLISHED,
      },
      include: {
        campaign: {
          select: {
            id: true,
            slug: true,
            title: true,
          },
        },
        _count: {
          select: {
            chapters: {
              where: { status: ContentStatus.PUBLISHED },
            },
            characters: true,
          },
        },
      },
    });

    // 2. Fall back to newest published case
    if (!caseRecord) {
      caseRecord = await prisma.case.findFirst({
        where: {
          status: ContentStatus.PUBLISHED,
        },
        orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
        include: {
          campaign: {
            select: {
              id: true,
              slug: true,
              title: true,
            },
          },
          _count: {
            select: {
              chapters: {
                where: { status: ContentStatus.PUBLISHED },
              },
              characters: true,
            },
          },
        },
      });
    }

    if (!caseRecord) {
      return null;
    }

    return {
      id: caseRecord.id,
      caseCode: caseRecord.caseCode,
      title: caseRecord.title,
      description: caseRecord.description,
      difficulty: caseRecord.difficulty,
      estimatedDurationMinutes: caseRecord.estimatedDurationMinutes,
      minPlayers: caseRecord.minPlayers,
      maxPlayers: caseRecord.maxPlayers,
      supportedPlayModes: caseRecord.supportedPlayModes,
      status: caseRecord.status,
      publishedAt: caseRecord.publishedAt ? caseRecord.publishedAt.toISOString() : null,
      campaign: caseRecord.campaign
        ? {
            id: caseRecord.campaign.id,
            slug: caseRecord.campaign.slug,
            title: caseRecord.campaign.title,
          }
        : null,
      chapterCount: caseRecord._count.chapters,
      characterCount: caseRecord._count.characters,
      isFeatured: true,
    };
  }

  /**
   * Retrieves all published campaigns with their published case count.
   */
  public static async getPublishedCampaigns(): Promise<SafeCampaignSummaryDto[]> {
    const campaigns = await prisma.campaign.findMany({
      where: {
        status: ContentStatus.PUBLISHED,
      },
      orderBy: {
        createdAt: "desc",
      },
      include: {
        _count: {
          select: {
            cases: {
              where: { status: ContentStatus.PUBLISHED },
            },
          },
        },
      },
    });

    return campaigns.map((camp) => ({
      id: camp.id,
      slug: camp.slug,
      title: camp.title,
      description: camp.description,
      coverImageUrl: camp.coverImageUrl,
      status: camp.status,
      caseCount: camp._count.cases,
    }));
  }

  /**
   * Retrieves a single published campaign by slug, including all its published cases.
   * Throws 404 CAMPAIGN_NOT_FOUND if not found or not published.
   */
  public static async getCampaignBySlug(slug: string): Promise<SafeCampaignDetailDto> {
    const trimmed = slug.trim();
    if (!trimmed) {
      throw new AppError("Invalid campaign slug provided", 400, "INVALID_CAMPAIGN_SLUG");
    }

    const campaign = await prisma.campaign.findFirst({
      where: {
        slug: trimmed,
        status: ContentStatus.PUBLISHED,
      },
      include: {
        cases: {
          where: { status: ContentStatus.PUBLISHED },
          orderBy: [{ publishedAt: "asc" }, { caseCode: "asc" }],
          include: {
            campaign: {
              select: {
                id: true,
                slug: true,
                title: true,
              },
            },
            _count: {
              select: {
                chapters: {
                  where: { status: ContentStatus.PUBLISHED },
                },
                characters: true,
              },
            },
          },
        },
      },
    });

    if (!campaign) {
      throw new AppError("Classified campaign not found or restricted", 404, "CAMPAIGN_NOT_FOUND");
    }

    const safeCases: SafeCaseSummaryDto[] = campaign.cases.map((c) => ({
      id: c.id,
      caseCode: c.caseCode,
      title: c.title,
      description: c.description,
      difficulty: c.difficulty,
      estimatedDurationMinutes: c.estimatedDurationMinutes,
      minPlayers: c.minPlayers,
      maxPlayers: c.maxPlayers,
      supportedPlayModes: c.supportedPlayModes,
      status: c.status,
      publishedAt: c.publishedAt ? c.publishedAt.toISOString() : null,
      campaign: {
        id: campaign.id,
        slug: campaign.slug,
        title: campaign.title,
      },
      chapterCount: c._count.chapters,
      characterCount: c._count.characters,
      isFeatured: c.caseCode === "CASE-001-MIDNIGHT-PROTOCOL",
    }));

    return {
      id: campaign.id,
      slug: campaign.slug,
      title: campaign.title,
      description: campaign.description,
      coverImageUrl: campaign.coverImageUrl,
      status: campaign.status,
      cases: safeCases,
    };
  }
}
