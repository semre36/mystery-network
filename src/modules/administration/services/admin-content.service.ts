import { prisma } from "@/server/infrastructure/database";
import { AppError } from "@/lib/errors/app-error";
import {
  ContentStatus,
  CaseDifficulty,
  PlayMode,
  ClueType,
  ClueStrategy,
  PuzzleType,
  Prisma,
} from "@prisma/client";
import { hashAnswer, normalizeAnswer } from "@/modules/puzzles/utils/crypto.util";
import { AdminAuditService } from "./audit.service";
import { AdminGuard } from "../guards/admin.guard";
import type { CaseSolutionConfig } from "@/modules/submissions/types/submission.types";

export class AdminContentService {
  // ============================================================================
  // 1. CAMPAIGNS CMS
  // ============================================================================

  public static async listCampaigns() {
    return prisma.campaign.findMany({
      include: {
        _count: { select: { cases: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  public static async getCampaignDetail(campaignId: string) {
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: {
        cases: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!campaign) throw new AppError("Campaign not found", 404, "CAMPAIGN_NOT_FOUND");
    return campaign;
  }

  public static async createCampaign(
    actorId: string,
    data: {
      slug: string;
      title: string;
      description: string;
      coverImageUrl?: string | null;
      status?: ContentStatus;
    }
  ) {
    const cleanSlug = data.slug
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, "-");

    const existing = await prisma.campaign.findUnique({ where: { slug: cleanSlug } });
    if (existing)
      throw new AppError(`Campaign with slug '${cleanSlug}' already exists`, 409, "SLUG_EXISTS");

    const campaign = await prisma.campaign.create({
      data: {
        slug: cleanSlug,
        title: data.title.trim(),
        description: data.description.trim(),
        coverImageUrl: data.coverImageUrl || null,
        status: data.status || ContentStatus.DRAFT,
      },
    });

    await AdminAuditService.recordAction({
      actorId,
      action: "CAMPAIGN_CREATE",
      resourceType: "Campaign",
      resourceId: campaign.id,
      metadata: { slug: campaign.slug, title: campaign.title, status: campaign.status },
    });

    return campaign;
  }

  public static async updateCampaign(
    actorId: string,
    campaignId: string,
    data: {
      title?: string;
      description?: string;
      coverImageUrl?: string | null;
      status?: ContentStatus;
    }
  ) {
    const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
    if (!campaign) throw new AppError("Campaign not found", 404, "CAMPAIGN_NOT_FOUND");

    const updated = await prisma.campaign.update({
      where: { id: campaignId },
      data: {
        ...(data.title ? { title: data.title.trim() } : {}),
        ...(data.description ? { description: data.description.trim() } : {}),
        ...(data.coverImageUrl !== undefined ? { coverImageUrl: data.coverImageUrl } : {}),
        ...(data.status ? { status: data.status } : {}),
      },
    });

    await AdminAuditService.recordAction({
      actorId,
      action: "CAMPAIGN_UPDATE",
      resourceType: "Campaign",
      resourceId: campaignId,
      metadata: { previousStatus: campaign.status, newStatus: updated.status },
    });

    return updated;
  }

  // ============================================================================
  // 2. CASES CMS
  // ============================================================================

  public static async listCases(
    filters: {
      status?: ContentStatus;
      difficulty?: CaseDifficulty;
      campaignId?: string;
    } = {}
  ) {
    const where: Prisma.CaseWhereInput = {};
    if (filters.status) where.status = filters.status;
    if (filters.difficulty) where.difficulty = filters.difficulty;
    if (filters.campaignId) where.campaignId = filters.campaignId;

    const cases = await prisma.case.findMany({
      where,
      include: {
        campaign: { select: { id: true, title: true, slug: true } },
        _count: {
          select: {
            chapters: true,
            characters: true,
            clues: true,
            puzzles: true,
            investigations: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Strip solutionConfig from list results to guarantee zero secret leakage
    return cases.map(({ solutionConfig: _sc, ...c }) => c);
  }

  public static async getCaseDetail(
    caseId: string,
    includeSecretSolution: boolean = false,
    includePuzzleSecrets: boolean = false
  ) {
    const c = await prisma.case.findUnique({
      where: { id: caseId },
      include: {
        campaign: true,
        chapters: { orderBy: { chapterOrder: "asc" } },
        characters: { orderBy: { name: "asc" } },
        clues: { orderBy: { createdAt: "asc" } },
        puzzles: {
          orderBy: { order: "asc" },
          include: { stages: { orderBy: { stageOrder: "asc" } } },
        },
        _count: { select: { investigations: true } },
      },
    });

    if (!c) throw new AppError("Case scenario not found", 404, "CASE_NOT_FOUND");

    let safeCase: any = c;

    // Scrub secret solution if caller does not have CASE_MANAGE_SOLUTION permission
    if (!includeSecretSolution) {
      const { solutionConfig: _sc, ...rest } = safeCase;
      safeCase = rest;
    }

    // Scrub puzzle secretConfiguration and solutionHash if caller lacks PUZZLE_MANAGE_SECRET
    if (!includePuzzleSecrets) {
      safeCase = {
        ...safeCase,
        puzzles: (safeCase.puzzles || []).map((p: any) => {
          const { secretConfiguration: _sc, solutionHash: _sh, ...restPuzzle } = p;
          const safeStages = (p.stages || []).map((s: any) => {
            const { secretConfiguration: _ssc, solutionHash: _ssh, ...restStage } = s;
            return restStage;
          });
          return {
            ...restPuzzle,
            stages: safeStages,
          };
        }),
      };
    }

    return safeCase;
  }

  public static async createCase(
    actorId: string,
    data: {
      caseCode: string;
      campaignId?: string | null;
      title: string;
      description: string;
      difficulty?: CaseDifficulty;
      estimatedDurationMinutes: number;
      minPlayers?: number;
      maxPlayers?: number;
      supportedPlayModes?: PlayMode[];
      status?: ContentStatus;
    }
  ) {
    const cleanCode = data.caseCode.trim().toUpperCase();

    const existing = await prisma.case.findUnique({ where: { caseCode: cleanCode } });
    if (existing)
      throw new AppError(`Case code '${cleanCode}' already exists`, 409, "CASE_CODE_EXISTS");

    const created = await prisma.case.create({
      data: {
        caseCode: cleanCode,
        campaignId: data.campaignId || null,
        title: data.title.trim(),
        description: data.description.trim(),
        difficulty: data.difficulty || CaseDifficulty.MEDIUM,
        estimatedDurationMinutes: data.estimatedDurationMinutes || 45,
        minPlayers: data.minPlayers || 1,
        maxPlayers: data.maxPlayers || 4,
        supportedPlayModes: data.supportedPlayModes || [PlayMode.SOLO, PlayMode.COOPERATIVE],
        status: data.status || ContentStatus.DRAFT,
      },
    });

    await AdminAuditService.recordAction({
      actorId,
      action: "CASE_CREATE",
      resourceType: "Case",
      resourceId: created.id,
      metadata: { caseCode: created.caseCode, title: created.title, status: created.status },
    });

    return created;
  }

  /**
   * Actionable publication validation for a mystery case scenario.
   * Checks chapters, characters, evidence references, puzzle configurations,
   * evaluation configuration (solutionConfig), and campaign relationships.
   */
  public static async validateCaseForPublication(caseId: string): Promise<string[]> {
    const caseScenario = await prisma.case.findUnique({
      where: { id: caseId },
      include: {
        campaign: true,
        chapters: { orderBy: { chapterOrder: "asc" } },
        characters: true,
        clues: true,
        puzzles: {
          include: { stages: true },
        },
      },
    });

    if (!caseScenario) return ["Case scenario not found in system."];

    const errors: string[] = [];

    // 1. Campaign relationship
    if (caseScenario.campaignId) {
      if (!caseScenario.campaign) {
        errors.push("Associated campaign record does not exist.");
      } else if (caseScenario.campaign.status === ContentStatus.ARCHIVED) {
        errors.push("Cannot publish a case linked to an ARCHIVED campaign.");
      }
    }

    // 2. Chapters validation
    if (!caseScenario.chapters || caseScenario.chapters.length === 0) {
      errors.push("Case must define at least one chapter/act before publication.");
    } else {
      const orders = caseScenario.chapters.map((ch) => ch.chapterOrder);
      const uniqueOrders = new Set(orders);
      if (uniqueOrders.size !== orders.length) {
        errors.push("Case chapters have duplicate chapterOrder values.");
      }
      for (const ch of caseScenario.chapters) {
        if (!ch.title || ch.title.trim().length === 0) {
          errors.push(`Chapter #${ch.chapterOrder} is missing a title.`);
        }
        if (!ch.description || ch.description.trim().length === 0) {
          errors.push(
            `Chapter #${ch.chapterOrder} ('${ch.title}') is missing a description/synopsis.`
          );
        }
      }
    }

    // 3. Characters validation
    if (!caseScenario.characters || caseScenario.characters.length === 0) {
      errors.push("Case must define at least one character / suspect of interest.");
    } else {
      for (const char of caseScenario.characters) {
        if (!char.name || char.name.trim().length === 0) {
          errors.push("One or more characters have an empty name.");
        }
        if (!char.description || char.description.trim().length === 0) {
          errors.push(`Character '${char.name}' is missing a narrative dossier.`);
        }
      }
    }

    // 4. Evidence references validation
    if (!caseScenario.clues || caseScenario.clues.length === 0) {
      errors.push("Case must define at least one forensic evidence item (clue).");
    } else {
      for (const clue of caseScenario.clues) {
        if (!clue.title || clue.title.trim().length === 0) {
          errors.push("One or more clues have an empty title.");
        }
        if (!clue.description || clue.description.trim().length === 0) {
          errors.push(`Clue '${clue.title}' is missing forensic description.`);
        }
      }
    }

    // 5. Puzzles configuration validation
    if (caseScenario.puzzles && caseScenario.puzzles.length > 0) {
      for (const puzzle of caseScenario.puzzles) {
        if (!puzzle.title || puzzle.title.trim().length === 0) {
          errors.push("One or more puzzles have an empty title.");
        }
        if (puzzle.isMultiStage) {
          if (!puzzle.stages || puzzle.stages.length === 0) {
            errors.push(
              `Multi-stage puzzle '${puzzle.title}' does not have any challenge stages configured.`
            );
          } else {
            for (const stage of puzzle.stages) {
              if (!stage.solutionHash || stage.solutionHash.trim().length === 0) {
                errors.push(
                  `Puzzle '${puzzle.title}' stage #${stage.stageOrder} is missing a valid solution hash.`
                );
              }
            }
          }
        } else if (!puzzle.solutionHash || puzzle.solutionHash.trim().length === 0) {
          errors.push(`Puzzle '${puzzle.title}' is missing a valid solution hash.`);
        }
      }
    }

    // 6. Evaluation configuration (solutionConfig)
    if (!caseScenario.solutionConfig || typeof caseScenario.solutionConfig !== "object") {
      errors.push(
        "Case is missing evaluation configuration (solutionConfig). Define the culprit and evaluation criteria."
      );
    } else {
      const cfg = caseScenario.solutionConfig as any;
      if (
        !cfg.primaryCharacterId &&
        (!cfg.primarySuspectId || cfg.primarySuspectId.trim().length === 0)
      ) {
        errors.push(
          "Evaluation configuration must specify a primary culprit/suspect (primaryCharacterId)."
        );
      }
      if (
        !cfg.motiveKeywords ||
        !Array.isArray(cfg.motiveKeywords) ||
        cfg.motiveKeywords.length === 0
      ) {
        errors.push(
          "Evaluation configuration must specify at least one motive keyword for submission scoring."
        );
      }
    }

    return errors;
  }

  public static async updateCase(
    actorId: string,
    caseId: string,
    data: {
      campaignId?: string | null;
      title?: string;
      description?: string;
      difficulty?: CaseDifficulty;
      estimatedDurationMinutes?: number;
      minPlayers?: number;
      maxPlayers?: number;
      supportedPlayModes?: PlayMode[];
      status?: ContentStatus;
    }
  ) {
    const target = await prisma.case.findUnique({ where: { id: caseId } });
    if (!target) throw new AppError("Case not found", 404, "CASE_NOT_FOUND");

    // Actionable publication validation check
    if (data.status === ContentStatus.PUBLISHED && target.status !== ContentStatus.PUBLISHED) {
      const validationErrors = await this.validateCaseForPublication(caseId);
      if (validationErrors.length > 0) {
        throw new AppError(
          `Case publication validation failed:\n- ${validationErrors.join("\n- ")}`,
          422,
          "PUBLICATION_VALIDATION_FAILED",
          true,
          { errors: validationErrors }
        );
      }
    }

    const updated = await prisma.case.update({
      where: { id: caseId },
      data: {
        ...(data.campaignId !== undefined ? { campaignId: data.campaignId } : {}),
        ...(data.title ? { title: data.title.trim() } : {}),
        ...(data.description ? { description: data.description.trim() } : {}),
        ...(data.difficulty ? { difficulty: data.difficulty } : {}),
        ...(data.estimatedDurationMinutes
          ? { estimatedDurationMinutes: data.estimatedDurationMinutes }
          : {}),
        ...(data.minPlayers ? { minPlayers: data.minPlayers } : {}),
        ...(data.maxPlayers ? { maxPlayers: data.maxPlayers } : {}),
        ...(data.supportedPlayModes ? { supportedPlayModes: data.supportedPlayModes } : {}),
        ...(data.status
          ? {
              status: data.status,
              ...(data.status === ContentStatus.PUBLISHED && !target.publishedAt
                ? { publishedAt: new Date() }
                : {}),
            }
          : {}),
      },
    });

    await AdminAuditService.recordAction({
      actorId,
      action: "CASE_UPDATE",
      resourceType: "Case",
      resourceId: caseId,
      metadata: {
        caseCode: target.caseCode,
        previousStatus: target.status,
        newStatus: updated.status,
      },
    });

    return updated;
  }

  /**
   * Protected secret solution configuration management.
   * Strictly requires CASE_MANAGE_SOLUTION permission.
   */
  public static async updateCaseSolutionConfig(
    actorId: string,
    caseId: string,
    solutionConfig: CaseSolutionConfig
  ) {
    if (actorId) {
      await AdminGuard.requirePermission("CASE_MANAGE_SOLUTION", actorId);
    }

    const target = await prisma.case.findUnique({
      where: { id: caseId },
      include: { characters: true, clues: true },
    });

    if (!target) throw new AppError("Case not found", 404, "CASE_NOT_FOUND");

    // Validate primary culprit exists in this case
    if (solutionConfig.primaryCharacterId) {
      const validChars = new Set(target.characters.map((c) => c.id));
      if (!validChars.has(solutionConfig.primaryCharacterId)) {
        throw new AppError(
          "Primary culprit must be a registered character in this case",
          400,
          "INVALID_CHARACTER"
        );
      }
    }

    const updated = await prisma.case.update({
      where: { id: caseId },
      data: { solutionConfig: solutionConfig as any },
    });

    await AdminAuditService.recordAction({
      actorId,
      action: "CASE_SOLUTION_CONFIG_UPDATE",
      resourceType: "Case",
      resourceId: caseId,
      metadata: {
        caseCode: target.caseCode,
        primaryCulpritSet: !!solutionConfig.primaryCharacterId,
        keywordsCount:
          (solutionConfig.motiveKeywords || []).length +
          (solutionConfig.methodKeywords || []).length,
      },
    });

    return updated.solutionConfig;
  }

  // ============================================================================
  // 3. CHAPTERS CMS
  // ============================================================================

  public static async createChapter(
    actorId: string,
    data: {
      caseId: string;
      chapterOrder: number;
      title: string;
      description: string;
      unlockConfig?: any;
      status?: ContentStatus;
    }
  ) {
    const chapter = await prisma.caseChapter.create({
      data: {
        caseId: data.caseId,
        chapterOrder: data.chapterOrder,
        title: data.title.trim(),
        description: data.description.trim(),
        unlockConfig: data.unlockConfig || Prisma.JsonNull,
        status: data.status || ContentStatus.DRAFT,
      },
    });

    await AdminAuditService.recordAction({
      actorId,
      action: "CHAPTER_CREATE",
      resourceType: "CaseChapter",
      resourceId: chapter.id,
      metadata: { caseId: data.caseId, chapterOrder: data.chapterOrder, title: data.title },
    });

    return chapter;
  }

  public static async updateChapter(
    actorId: string,
    chapterId: string,
    data: {
      chapterOrder?: number;
      title?: string;
      description?: string;
      unlockConfig?: any;
      status?: ContentStatus;
    }
  ) {
    const chapter = await prisma.caseChapter.update({
      where: { id: chapterId },
      data: {
        ...(data.chapterOrder !== undefined ? { chapterOrder: data.chapterOrder } : {}),
        ...(data.title ? { title: data.title.trim() } : {}),
        ...(data.description ? { description: data.description.trim() } : {}),
        ...(data.unlockConfig !== undefined ? { unlockConfig: data.unlockConfig } : {}),
        ...(data.status ? { status: data.status } : {}),
      },
    });

    await AdminAuditService.recordAction({
      actorId,
      action: "CHAPTER_UPDATE",
      resourceType: "CaseChapter",
      resourceId: chapterId,
      metadata: { chapterOrder: chapter.chapterOrder, title: chapter.title },
    });

    return chapter;
  }

  // ============================================================================
  // 4. CHARACTERS CMS
  // ============================================================================

  public static async createCharacter(
    actorId: string,
    data: {
      caseId: string;
      name: string;
      description: string;
      metadata?: any;
    }
  ) {
    const character = await prisma.caseCharacter.create({
      data: {
        caseId: data.caseId,
        name: data.name.trim(),
        description: data.description.trim(),
        metadata: data.metadata || Prisma.JsonNull,
      },
    });

    await AdminAuditService.recordAction({
      actorId,
      action: "CHARACTER_CREATE",
      resourceType: "CaseCharacter",
      resourceId: character.id,
      metadata: { caseId: data.caseId, name: data.name },
    });

    return character;
  }

  public static async updateCharacter(
    actorId: string,
    characterId: string,
    data: {
      name?: string;
      description?: string;
      metadata?: any;
    }
  ) {
    const character = await prisma.caseCharacter.update({
      where: { id: characterId },
      data: {
        ...(data.name ? { name: data.name.trim() } : {}),
        ...(data.description ? { description: data.description.trim() } : {}),
        ...(data.metadata !== undefined ? { metadata: data.metadata } : {}),
      },
    });

    await AdminAuditService.recordAction({
      actorId,
      action: "CHARACTER_UPDATE",
      resourceType: "CaseCharacter",
      resourceId: characterId,
      metadata: { name: character.name },
    });

    return character;
  }

  // ============================================================================
  // 5. EVIDENCE & CLUES CMS
  // ============================================================================

  public static async createClue(
    actorId: string,
    data: {
      caseId: string;
      chapterId?: string | null;
      clueCode: string;
      title: string;
      description: string;
      content: any;
      clueType: ClueType;
      assignmentStrategy?: ClueStrategy;
      isShareable?: boolean;
      status?: ContentStatus;
    }
  ) {
    const cleanCode = data.clueCode.trim().toUpperCase();

    const clue = await prisma.clue.create({
      data: {
        caseId: data.caseId,
        chapterId: data.chapterId || null,
        clueCode: cleanCode,
        title: data.title.trim(),
        description: data.description.trim(),
        content: data.content || {},
        clueType: data.clueType,
        assignmentStrategy: data.assignmentStrategy || ClueStrategy.RANDOM,
        isShareable: data.isShareable !== undefined ? data.isShareable : true,
        status: data.status || ContentStatus.DRAFT,
      },
    });

    await AdminAuditService.recordAction({
      actorId,
      action: "EVIDENCE_CREATE",
      resourceType: "Clue",
      resourceId: clue.id,
      metadata: { clueCode: clue.clueCode, title: clue.title, strategy: clue.assignmentStrategy },
    });

    return clue;
  }

  public static async updateClue(
    actorId: string,
    clueId: string,
    data: {
      chapterId?: string | null;
      title?: string;
      description?: string;
      content?: any;
      clueType?: ClueType;
      assignmentStrategy?: ClueStrategy;
      isShareable?: boolean;
      status?: ContentStatus;
    }
  ) {
    const clue = await prisma.clue.update({
      where: { id: clueId },
      data: {
        ...(data.chapterId !== undefined ? { chapterId: data.chapterId } : {}),
        ...(data.title ? { title: data.title.trim() } : {}),
        ...(data.description ? { description: data.description.trim() } : {}),
        ...(data.content !== undefined ? { content: data.content } : {}),
        ...(data.clueType ? { clueType: data.clueType } : {}),
        ...(data.assignmentStrategy ? { assignmentStrategy: data.assignmentStrategy } : {}),
        ...(data.isShareable !== undefined ? { isShareable: data.isShareable } : {}),
        ...(data.status ? { status: data.status } : {}),
      },
    });

    await AdminAuditService.recordAction({
      actorId,
      action: "EVIDENCE_UPDATE",
      resourceType: "Clue",
      resourceId: clueId,
      metadata: { clueCode: clue.clueCode, status: clue.status },
    });

    return clue;
  }

  // ============================================================================
  // 6. PUZZLES CMS
  // ============================================================================

  public static async createPuzzle(
    actorId: string,
    data: {
      caseId: string;
      chapterId?: string | null;
      title: string;
      description: string;
      instructions?: string;
      puzzleType: PuzzleType;
      difficulty?: CaseDifficulty;
      configuration: any;
      publicConfiguration?: any;
      secretConfiguration?: any;
      rawSolution?: string;
      maxAttempts?: number | null;
      order?: number;
      isMultiStage?: boolean;
      status?: ContentStatus;
    }
  ) {
    // Require PUZZLE_MANAGE_SECRET if secret solution or secret config is being configured
    if (actorId && (data.rawSolution || data.secretConfiguration)) {
      await AdminGuard.requirePermission("PUZZLE_MANAGE_SECRET", actorId);
    }

    // Generate secure solution hash
    const normalized = normalizeAnswer(data.rawSolution || "");
    const solutionHash = hashAnswer(normalized);

    const puzzle = await prisma.puzzle.create({
      data: {
        caseId: data.caseId,
        chapterId: data.chapterId || null,
        title: data.title.trim(),
        description: data.description.trim(),
        instructions: data.instructions?.trim() || null,
        puzzleType: data.puzzleType,
        difficulty: data.difficulty || CaseDifficulty.MEDIUM,
        configuration: data.configuration || {},
        publicConfiguration: data.publicConfiguration || Prisma.JsonNull,
        secretConfiguration: data.secretConfiguration || Prisma.JsonNull,
        solutionHash,
        maxAttempts: data.maxAttempts || null,
        order: data.order || 1,
        isMultiStage: data.isMultiStage || false,
        status: data.status || ContentStatus.DRAFT,
      },
    });

    await AdminAuditService.recordAction({
      actorId,
      action: "PUZZLE_CREATE",
      resourceType: "Puzzle",
      resourceId: puzzle.id,
      metadata: {
        caseId: puzzle.caseId,
        title: puzzle.title,
        puzzleType: puzzle.puzzleType,
      },
    });

    return puzzle;
  }

  public static async updatePuzzle(
    actorId: string,
    puzzleId: string,
    data: {
      chapterId?: string | null;
      title?: string;
      description?: string;
      instructions?: string;
      puzzleType?: PuzzleType;
      difficulty?: CaseDifficulty;
      configuration?: any;
      publicConfiguration?: any;
      secretConfiguration?: any;
      rawSolution?: string;
      maxAttempts?: number | null;
      order?: number;
      status?: ContentStatus;
    }
  ) {
    // Require PUZZLE_MANAGE_SECRET if secret solution or secret config is being modified
    if (actorId && (data.rawSolution || data.secretConfiguration !== undefined)) {
      await AdminGuard.requirePermission("PUZZLE_MANAGE_SECRET", actorId);
    }

    const updatePayload: Prisma.PuzzleUpdateInput = {
      ...(data.chapterId !== undefined
        ? { chapter: data.chapterId ? { connect: { id: data.chapterId } } : { disconnect: true } }
        : {}),
      ...(data.title ? { title: data.title.trim() } : {}),
      ...(data.description ? { description: data.description.trim() } : {}),
      ...(data.instructions !== undefined ? { instructions: data.instructions } : {}),
      ...(data.puzzleType ? { puzzleType: data.puzzleType } : {}),
      ...(data.difficulty ? { difficulty: data.difficulty } : {}),
      ...(data.configuration !== undefined ? { configuration: data.configuration } : {}),
      ...(data.publicConfiguration !== undefined
        ? { publicConfiguration: data.publicConfiguration }
        : {}),
      ...(data.secretConfiguration !== undefined
        ? { secretConfiguration: data.secretConfiguration }
        : {}),
      ...(data.maxAttempts !== undefined ? { maxAttempts: data.maxAttempts } : {}),
      ...(data.order !== undefined ? { order: data.order } : {}),
      ...(data.status ? { status: data.status } : {}),
    };

    if (data.rawSolution) {
      const normalized = normalizeAnswer(data.rawSolution);
      updatePayload.solutionHash = hashAnswer(normalized);
    }

    const puzzle = await prisma.puzzle.update({
      where: { id: puzzleId },
      data: updatePayload,
    });

    await AdminAuditService.recordAction({
      actorId,
      action: "PUZZLE_UPDATE",
      resourceType: "Puzzle",
      resourceId: puzzleId,
      metadata: { title: puzzle.title, status: puzzle.status },
    });

    return puzzle;
  }

  /**
   * Retrieves full puzzle detail. Redacts secretConfiguration and solutionHash
   * unless includeSecrets is explicitly true.
   */
  public static async getPuzzleDetail(puzzleId: string, includeSecrets: boolean = false) {
    const puzzle = await prisma.puzzle.findUnique({
      where: { id: puzzleId },
      include: {
        stages: { orderBy: { stageOrder: "asc" } },
        chapter: { select: { id: true, title: true, chapterOrder: true } },
      },
    });

    if (!puzzle) throw new AppError("Puzzle challenge not found", 404, "PUZZLE_NOT_FOUND");

    if (!includeSecrets) {
      const { secretConfiguration: _sc, solutionHash: _sh, ...safePuzzle } = puzzle;
      const safeStages = (safePuzzle.stages || []).map(
        ({ solutionHash: _ssh, secretConfiguration: _ssc, ...rest }) => rest
      );
      return {
        ...safePuzzle,
        stages: safeStages,
      };
    }

    return puzzle;
  }
}
