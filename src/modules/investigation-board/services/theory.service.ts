import { prisma } from "@/server/infrastructure/database";
import { AppError } from "@/lib/errors/app-error";
import { BoardGuard } from "../guards/board.guard";
import {
  CreateTheoryInput,
  UpdateTheoryInput,
  AddTheoryEvidenceInput,
  SafeInvestigationTheoryDto,
  SafeTheoryEvidenceDto,
  TheoryStatus,
  TheoryEvidenceRelationship,
} from "../types/board.types";
import { logger } from "@/lib/logger";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export class TheoryService {
  /**
   * Retrieves all shared investigation hypotheses with supporting/contradicting evidence counts.
   */
  public static async getTheories(
    userId: string,
    investigationId: string
  ): Promise<SafeInvestigationTheoryDto[]> {
    const { investigation } = await BoardGuard.verifyBoardAccess(userId, investigationId, {
      allowReadOnlyIfConcluded: true,
    });

    const theories = await prisma.investigationTheory.findMany({
      where: { investigationId: investigation.id },
      include: {
        createdBy: {
          select: { codename: true },
        },
        evidence: {
          select: { relationship: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return theories.map((t) => {
      let supports = 0;
      let contradicts = 0;
      let neutral = 0;

      for (const e of t.evidence) {
        if (e.relationship === TheoryEvidenceRelationship.SUPPORTS) supports++;
        else if (e.relationship === TheoryEvidenceRelationship.CONTRADICTS) contradicts++;
        else neutral++;
      }

      return {
        id: t.id,
        investigationId: t.investigationId,
        title: t.title,
        description: t.description,
        status: t.status,
        createdByPlayerId: t.createdByPlayerId,
        createdByCodename: t.createdBy.codename,
        evidenceSummary: {
          supports,
          contradicts,
          neutral,
          total: t.evidence.length,
        },
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
      };
    });
  }

  /**
   * Retrieves single theory details with linked supporting and contradicting clues.
   * Access to evidence records is verified on-the-fly.
   */
  public static async getTheoryDetail(
    userId: string,
    investigationId: string,
    theoryId: string
  ): Promise<SafeInvestigationTheoryDto> {
    const trimmedTheoryId = (theoryId || "").trim();
    if (!UUID_REGEX.test(trimmedTheoryId)) {
      throw new AppError("Invalid theory identifier", 400, "INVALID_THEORY_ID");
    }

    const { investigation } = await BoardGuard.verifyBoardAccess(userId, investigationId, {
      allowReadOnlyIfConcluded: true,
    });

    const theory = await prisma.investigationTheory.findUnique({
      where: { id: trimmedTheoryId },
      include: {
        createdBy: {
          select: { codename: true },
        },
        evidence: {
          include: {
            clue: {
              select: {
                id: true,
                title: true,
                clueCode: true,
                clueType: true,
              },
            },
            createdBy: {
              select: { codename: true },
            },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!theory || theory.investigationId !== investigation.id) {
      throw new AppError("Investigation theory not found or restricted", 404, "THEORY_NOT_FOUND");
    }

    let supports = 0;
    let contradicts = 0;
    let neutral = 0;

    const safeEvidence: SafeTheoryEvidenceDto[] = [];

    for (const e of theory.evidence) {
      if (e.relationship === TheoryEvidenceRelationship.SUPPORTS) supports++;
      else if (e.relationship === TheoryEvidenceRelationship.CONTRADICTS) contradicts++;
      else neutral++;

      // Check whether this evidence is accessible to operative
      let clueTitle = e.clue.title;
      let clueCode = e.clue.clueCode;
      let clueType = e.clue.clueType;

      try {
        await BoardGuard.verifyEvidenceAccessForBoard(userId, investigation.id, e.clueId);
      } catch {
        clueTitle = "[Restricted Evidence]";
        clueCode = null;
        clueType = "RESTRICTED" as any;
      }

      safeEvidence.push({
        id: e.id,
        theoryId: e.theoryId,
        clueId: e.clueId,
        clueTitle,
        clueCode,
        clueType,
        relationship: e.relationship,
        explanation: e.explanation,
        createdByPlayerId: e.createdByPlayerId,
        createdByCodename: e.createdBy.codename,
        createdAt: e.createdAt.toISOString(),
        updatedAt: e.updatedAt.toISOString(),
      });
    }

    return {
      id: theory.id,
      investigationId: theory.investigationId,
      title: theory.title,
      description: theory.description,
      status: theory.status,
      createdByPlayerId: theory.createdByPlayerId,
      createdByCodename: theory.createdBy.codename,
      evidenceSummary: {
        supports,
        contradicts,
        neutral,
        total: theory.evidence.length,
      },
      evidence: safeEvidence,
      createdAt: theory.createdAt.toISOString(),
      updatedAt: theory.updatedAt.toISOString(),
    };
  }

  /**
   * Formulates a new investigation hypothesis.
   */
  public static async createTheory(
    userId: string,
    investigationId: string,
    input: CreateTheoryInput
  ): Promise<SafeInvestigationTheoryDto> {
    const { investigation, playerId, playerProfile } = await BoardGuard.verifyBoardAccess(
      userId,
      investigationId
    );

    const theory = await prisma.investigationTheory.create({
      data: {
        investigationId: investigation.id,
        title: input.title,
        description: input.description,
        status: input.status ?? TheoryStatus.ACTIVE,
        createdByPlayerId: playerId,
      },
    });

    logger.info("Created investigation theory", {
      theoryId: theory.id,
      investigationId: investigation.id,
      status: theory.status,
    });

    return {
      id: theory.id,
      investigationId: theory.investigationId,
      title: theory.title,
      description: theory.description,
      status: theory.status,
      createdByPlayerId: theory.createdByPlayerId,
      createdByCodename: playerProfile.codename,
      evidenceSummary: {
        supports: 0,
        contradicts: 0,
        neutral: 0,
        total: 0,
      },
      evidence: [],
      createdAt: theory.createdAt.toISOString(),
      updatedAt: theory.updatedAt.toISOString(),
    };
  }

  /**
   * Updates an existing theory's title, description, or status (ACTIVE, SUPPORTED, CHALLENGED, ARCHIVED).
   */
  public static async updateTheory(
    userId: string,
    investigationId: string,
    theoryId: string,
    input: UpdateTheoryInput
  ): Promise<SafeInvestigationTheoryDto> {
    const trimmedTheoryId = (theoryId || "").trim();
    if (!UUID_REGEX.test(trimmedTheoryId)) {
      throw new AppError("Invalid theory identifier", 400, "INVALID_THEORY_ID");
    }

    const { investigation, playerProfile } = await BoardGuard.verifyBoardAccess(
      userId,
      investigationId
    );

    const existing = await prisma.investigationTheory.findUnique({
      where: { id: trimmedTheoryId },
      include: {
        evidence: { select: { relationship: true } },
      },
    });

    if (!existing || existing.investigationId !== investigation.id) {
      throw new AppError("Investigation theory not found or restricted", 404, "THEORY_NOT_FOUND");
    }

    const updated = await prisma.investigationTheory.update({
      where: { id: trimmedTheoryId },
      data: {
        ...(typeof input.title === "string" ? { title: input.title } : {}),
        ...(typeof input.description === "string" ? { description: input.description } : {}),
        ...(input.status ? { status: input.status } : {}),
      },
    });

    let supports = 0;
    let contradicts = 0;
    let neutral = 0;

    for (const e of existing.evidence) {
      if (e.relationship === TheoryEvidenceRelationship.SUPPORTS) supports++;
      else if (e.relationship === TheoryEvidenceRelationship.CONTRADICTS) contradicts++;
      else neutral++;
    }

    return {
      id: updated.id,
      investigationId: updated.investigationId,
      title: updated.title,
      description: updated.description,
      status: updated.status,
      createdByPlayerId: updated.createdByPlayerId,
      createdByCodename: playerProfile.codename,
      evidenceSummary: {
        supports,
        contradicts,
        neutral,
        total: existing.evidence.length,
      },
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  }

  /**
   * Deletes a theory and cascades to clean up its evidence links.
   */
  public static async deleteTheory(
    userId: string,
    investigationId: string,
    theoryId: string
  ): Promise<void> {
    const trimmedTheoryId = (theoryId || "").trim();
    if (!UUID_REGEX.test(trimmedTheoryId)) {
      throw new AppError("Invalid theory identifier", 400, "INVALID_THEORY_ID");
    }

    const { investigation } = await BoardGuard.verifyBoardAccess(userId, investigationId);

    const existing = await prisma.investigationTheory.findUnique({
      where: { id: trimmedTheoryId },
    });

    if (!existing || existing.investigationId !== investigation.id) {
      throw new AppError("Investigation theory not found or restricted", 404, "THEORY_NOT_FOUND");
    }

    await prisma.investigationTheory.delete({
      where: { id: trimmedTheoryId },
    });

    logger.info("Deleted investigation theory", {
      theoryId: trimmedTheoryId,
      investigationId: investigation.id,
    });
  }

  /**
   * Associates a declassified evidence item with a theory as SUPPORTS, CONTRADICTS, or NEUTRAL.
   */
  public static async addTheoryEvidence(
    userId: string,
    investigationId: string,
    theoryId: string,
    input: AddTheoryEvidenceInput
  ): Promise<SafeTheoryEvidenceDto> {
    const trimmedTheoryId = (theoryId || "").trim();
    const trimmedClueId = (input.clueId || "").trim();

    if (!UUID_REGEX.test(trimmedTheoryId)) {
      throw new AppError("Invalid theory identifier", 400, "INVALID_THEORY_ID");
    }
    if (!UUID_REGEX.test(trimmedClueId)) {
      throw new AppError("Invalid evidence identifier", 400, "INVALID_EVIDENCE_ID");
    }

    const { investigation, playerId, playerProfile } = await BoardGuard.verifyBoardAccess(
      userId,
      investigationId
    );

    const theory = await prisma.investigationTheory.findUnique({
      where: { id: trimmedTheoryId },
    });

    if (!theory || theory.investigationId !== investigation.id) {
      throw new AppError("Investigation theory not found or restricted", 404, "THEORY_NOT_FOUND");
    }

    // Verify evidence access via EvidenceService
    const clue = await BoardGuard.verifyEvidenceAccessForBoard(
      userId,
      investigation.id,
      trimmedClueId
    );

    const relationship = input.relationship ?? TheoryEvidenceRelationship.SUPPORTS;

    const association = await prisma.theoryEvidence.upsert({
      where: {
        theoryId_clueId: {
          theoryId: trimmedTheoryId,
          clueId: trimmedClueId,
        },
      },
      update: {
        relationship,
        explanation: input.explanation ?? null,
      },
      create: {
        theoryId: trimmedTheoryId,
        clueId: trimmedClueId,
        relationship,
        explanation: input.explanation ?? null,
        createdByPlayerId: playerId,
      },
    });

    logger.info("Associated evidence with investigation theory", {
      theoryId: trimmedTheoryId,
      clueId: trimmedClueId,
      relationship,
    });

    return {
      id: association.id,
      theoryId: association.theoryId,
      clueId: association.clueId,
      clueTitle: clue.title,
      clueCode: clue.clueCode,
      clueType: clue.clueType,
      relationship: association.relationship,
      explanation: association.explanation,
      createdByPlayerId: association.createdByPlayerId,
      createdByCodename: playerProfile.codename,
      createdAt: association.createdAt.toISOString(),
      updatedAt: association.updatedAt.toISOString(),
    };
  }

  /**
   * Removes an evidence association from a theory.
   */
  public static async removeTheoryEvidence(
    userId: string,
    investigationId: string,
    theoryId: string,
    associationId: string
  ): Promise<void> {
    const trimmedTheoryId = (theoryId || "").trim();
    const trimmedAssocId = (associationId || "").trim();

    if (!UUID_REGEX.test(trimmedTheoryId) || !UUID_REGEX.test(trimmedAssocId)) {
      throw new AppError("Invalid identifier", 400, "INVALID_IDENTIFIER");
    }

    const { investigation } = await BoardGuard.verifyBoardAccess(userId, investigationId);

    const association = await prisma.theoryEvidence.findUnique({
      where: { id: trimmedAssocId },
      include: {
        theory: { select: { investigationId: true } },
      },
    });

    if (
      !association ||
      association.theoryId !== trimmedTheoryId ||
      association.theory.investigationId !== investigation.id
    ) {
      throw new AppError("Theory evidence association not found", 404, "ASSOCIATION_NOT_FOUND");
    }

    await prisma.theoryEvidence.delete({
      where: { id: trimmedAssocId },
    });

    logger.info("Removed evidence association from theory", {
      associationId: trimmedAssocId,
      theoryId: trimmedTheoryId,
      investigationId: investigation.id,
    });
  }
}

