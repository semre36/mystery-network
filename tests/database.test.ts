import { describe, it, expect } from "vitest";
import { prisma } from "@/server/infrastructure/database";
import {
  UserStatus,
  ContentStatus,
  CaseDifficulty,
  PlayMode,
  InvestigationStatus,
  ParticipantStatus,
  ChapterProgressStatus,
  ClueType,
  ClueStrategy,
  AssignmentStatus,
  AssetType,
  PuzzleType,
  AttemptStatus,
  TeamStatus,
  TeamRole,
  MembershipStatus,
  InvitationStatus,
  SubmissionStatus,
  EvaluationResult,
  AchievementCategory,
  NotificationType,
} from "@prisma/client";

describe("Database Architecture & Prisma Setup (Phase 02)", () => {
  describe("Prisma Client Singleton & Model Delegates", () => {
    it("should export an initialized PrismaClient singleton instance", () => {
      expect(prisma).toBeDefined();
      expect(typeof prisma.$connect).toBe("function");
      expect(typeof prisma.$disconnect).toBe("function");
    });

    it("should expose all required Domain A (Identity & Players) delegates", () => {
      expect(prisma.user).toBeDefined();
      expect(prisma.playerProfile).toBeDefined();
    });

    it("should expose all required Domain B (Campaign & Content) delegates", () => {
      expect(prisma.campaign).toBeDefined();
      expect(prisma.case).toBeDefined();
      expect(prisma.caseChapter).toBeDefined();
      expect(prisma.caseCharacter).toBeDefined();
    });

    it("should expose all required Domain C (Investigation Engine) delegates", () => {
      expect(prisma.investigation).toBeDefined();
      expect(prisma.investigationParticipant).toBeDefined();
      expect(prisma.investigationProgress).toBeDefined();
    });

    it("should expose all required Domain D (Evidence & Clues) delegates", () => {
      expect(prisma.clue).toBeDefined();
      expect(prisma.clueAssignment).toBeDefined();
      expect(prisma.evidenceShare).toBeDefined();
      expect(prisma.evidenceAsset).toBeDefined();
    });

    it("should expose all required Domain E (Puzzle System) delegates", () => {
      expect(prisma.puzzle).toBeDefined();
      expect(prisma.puzzleAttempt).toBeDefined();
    });

    it("should expose all required Domain F (Team Collaboration) delegates", () => {
      expect(prisma.team).toBeDefined();
      expect(prisma.teamMembership).toBeDefined();
      expect(prisma.teamInvitation).toBeDefined();
    });

    it("should expose all required Domain G (Submissions & Evaluation) delegates", () => {
      expect(prisma.caseSubmission).toBeDefined();
      expect(prisma.submissionEvaluation).toBeDefined();
    });

    it("should expose all required Domain H (Player Progression) delegates", () => {
      expect(prisma.xPTransaction).toBeDefined();
      expect(prisma.achievement).toBeDefined();
      expect(prisma.userAchievement).toBeDefined();
    });

    it("should expose all required Domain I (Notifications) delegates", () => {
      expect(prisma.notification).toBeDefined();
    });

    it("should expose all required Domain J (Administration & Audit) delegates", () => {
      expect(prisma.adminRole).toBeDefined();
      expect(prisma.adminPermission).toBeDefined();
      expect(prisma.adminRolePermission).toBeDefined();
      expect(prisma.adminAuditLog).toBeDefined();
    });
  });

  describe("Enum Definitions Integrity", () => {
    it("should export all required application enums", () => {
      expect(UserStatus.ACTIVE).toBe("ACTIVE");
      expect(ContentStatus.PUBLISHED).toBe("PUBLISHED");
      expect(CaseDifficulty.EXPERT).toBe("EXPERT");
      expect(PlayMode.COOPERATIVE).toBe("COOPERATIVE");
      expect(InvestigationStatus.IN_PROGRESS).toBe("IN_PROGRESS");
      expect(ParticipantStatus.ACTIVE).toBe("ACTIVE");
      expect(ChapterProgressStatus.UNLOCKED).toBe("UNLOCKED");
      expect(ClueType.CIPHER_FRAGMENT).toBe("CIPHER_FRAGMENT");
      expect(ClueStrategy.ASYMMETRIC_EXCLUSIVE).toBe("ASYMMETRIC_EXCLUSIVE");
      expect(AssignmentStatus.UNSEEN).toBe("UNSEEN");
      expect(AssetType.AUDIO).toBe("AUDIO");
      expect(PuzzleType.CIPHER).toBe("CIPHER");
      expect(AttemptStatus.CORRECT).toBe("CORRECT");
      expect(TeamStatus.ACTIVE).toBe("ACTIVE");
      expect(TeamRole.LEAD_INVESTIGATOR).toBe("LEAD_INVESTIGATOR");
      expect(MembershipStatus.ACTIVE).toBe("ACTIVE");
      expect(InvitationStatus.PENDING).toBe("PENDING");
      expect(SubmissionStatus.SUBMITTED).toBe("SUBMITTED");
      expect(EvaluationResult.SOLVED_PERFECT).toBe("SOLVED_PERFECT");
      expect(AchievementCategory.DEDUCTION).toBe("DEDUCTION");
      expect(NotificationType.CLUE_RECEIVED).toBe("CLUE_RECEIVED");
    });
  });

  describe("Database Connection String Validation Helper", () => {
    function validateDatabaseUrl(url: string | undefined): { isValid: boolean; reason?: string } {
      if (!url) {
        return { isValid: false, reason: "URL is empty" };
      }
      if (!url.startsWith("postgresql://") && !url.startsWith("postgres://")) {
        return {
          isValid: false,
          reason: "Invalid scheme: Must start with postgresql:// or postgres://",
        };
      }
      if (!url.includes("sslmode=require")) {
        return { isValid: false, reason: "Neon requires sslmode=require in production" };
      }
      return { isValid: true };
    }

    it("should pass for valid Neon PostgreSQL URLs", () => {
      const validNeonUrl =
        "postgresql://user:pass@ep-cool-app-12345.eu-central-1.aws.neon.tech/neondb?sslmode=require";
      expect(validateDatabaseUrl(validNeonUrl).isValid).toBe(true);
    });

    it("should reject URLs lacking sslmode=require", () => {
      const insecureUrl = "postgresql://user:pass@localhost:5432/test";
      const result = validateDatabaseUrl(insecureUrl);
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain("sslmode=require");
    });
  });
});
