import { describe, it, expect, vi, beforeEach } from "vitest";
import { SubmissionService } from "@/modules/submissions/services/submission.service";
import { EvaluationService } from "@/modules/submissions/services/evaluation.service";
import { SubmissionGuard } from "@/modules/submissions/guards/submission.guard";
import { RewardService } from "@/modules/progression/services/reward.service";
import { ProgressionService } from "@/modules/progression/services/progression.service";
import {
  calculateLevelFromXP,
  getXPThresholdForLevel,
  getLevelProgress,
  getRankTitle,
} from "@/modules/progression/utils/progression.util";
import {
  SaveSubmissionDraftSchema,
  FinalSubmissionSchema,
} from "@/modules/submissions/validation/submission.schema";
import {
  GET as getSubmissionsRoute,
  POST as saveDraftRoute,
} from "@/app/api/investigations/[investigationId]/submissions/route";
import { POST as submitFinalRoute } from "@/app/api/investigations/[investigationId]/submissions/submit/route";
import { GET as getResultsRoute } from "@/app/api/investigations/[investigationId]/results/route";
import { GET as getProgressionRoute } from "@/app/api/player/progression/route";
import { GET as getAchievementsRoute } from "@/app/api/player/achievements/route";
import * as authGuard from "@/modules/authentication/guards/auth.guard";
import { prisma } from "@/server/infrastructure/database";
import { AppError } from "@/lib/errors/app-error";
import {
  InvestigationStatus,
  ParticipantStatus,
  SubmissionStatus,
  EvaluationResult,
  PlayMode,
  TeamRole,
  TeamStatus,
  MembershipStatus,
} from "@prisma/client";
import { NextRequest } from "next/server";

describe("Submissions, Evaluation Engine, Results & Player Rewards (Phase 12)", () => {
  const MOCK_USER_ID = "00000000-0000-4000-a000-000000000001";
  const MOCK_OTHER_USER_ID = "00000000-0000-4000-a000-000000000002";
  const MOCK_PROFILE_ID = "00000000-0000-4000-a000-000000000003";
  const MOCK_OTHER_PROFILE_ID = "00000000-0000-4000-a000-000000000004";
  const MOCK_CASE_ID = "00000000-0000-4000-a000-000000000005";
  const MOCK_INVESTIGATION_ID = "00000000-0000-4000-a000-000000000008";
  const MOCK_SUSPECT_ID = "00000000-0000-4000-a000-000000000009";
  const MOCK_INNOCENT_ID = "00000000-0000-4000-a000-00000000000a";
  const MOCK_CLUE_1 = "00000000-0000-4000-a000-00000000000b";
  const MOCK_CLUE_2 = "00000000-0000-4000-a000-00000000000c";
  const MOCK_CLUE_CONTRADICT = "00000000-0000-4000-a000-00000000000d";
  const MOCK_SUBMISSION_ID = "00000000-0000-4000-a000-00000000000e";

  const mockAuthenticatedUser = {
    id: MOCK_USER_ID,
    telegramId: "123456789",
  };

  const mockSolutionConfig = {
    primaryCharacterId: MOCK_SUSPECT_ID,
    motiveKeywords: ["blackmail", "embezzlement", "extortion"],
    methodKeywords: ["cyanide", "poison", "digital override"],
    timelineKeywords: ["midnight", "23:45", "server room"],
    requiredSupportingClueCodes: ["CLUE-001", "CLUE-002"],
    requiredContradictingClueCodes: ["CLUE-ALIBI-001"],
    scoringCriteria: {
      primarySuspectWeight: 30,
      motiveWeight: 15,
      methodWeight: 15,
      timelineWeight: 15,
      supportingEvidenceWeight: 15,
      contradictingEvidenceWeight: 10,
      maxScore: 100,
      passScore: 60,
      perfectScore: 90,
    },
    xpRewards: {
      base: 500,
      bonus: 250,
    },
  };

  const createMockInvestigation = (overrides: Record<string, any> = {}) => ({
    id: MOCK_INVESTIGATION_ID,
    caseId: MOCK_CASE_ID,
    playMode: PlayMode.SOLO,
    status: InvestigationStatus.IN_PROGRESS,
    teamId: null,
    case: {
      id: MOCK_CASE_ID,
      title: "The Midnight Protocol",
      caseCode: "CASE-001",
      difficulty: "INTERMEDIATE",
      status: "PUBLISHED",
      solutionConfig: mockSolutionConfig,
      characters: [
        { id: MOCK_SUSPECT_ID, name: "Marcus Thorne" },
        { id: MOCK_INNOCENT_ID, name: "Elena Rostova" },
      ],
      clues: [
        { id: MOCK_CLUE_1, clueCode: "CLUE-001", title: "Encrypted Flash Drive" },
        { id: MOCK_CLUE_2, clueCode: "CLUE-002", title: "Poison Vial" },
        { id: MOCK_CLUE_CONTRADICT, clueCode: "CLUE-ALIBI-001", title: "Security Badge Log" },
      ],
    },
    team: null,
    participants: [
      {
        id: "participant-1",
        investigationId: MOCK_INVESTIGATION_ID,
        playerId: MOCK_PROFILE_ID,
        status: ParticipantStatus.ACTIVE,
      },
    ],
    ...overrides,
  });

  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe("1. Progression & Leveling Mathematical Utilities", () => {
    it("should calculate level correctly according to Level = floor(1 + sqrt(totalXP / 100))", () => {
      expect(calculateLevelFromXP(0)).toBe(1);
      expect(calculateLevelFromXP(50)).toBe(1);
      expect(calculateLevelFromXP(99)).toBe(1);
      expect(calculateLevelFromXP(100)).toBe(2);
      expect(calculateLevelFromXP(399)).toBe(2);
      expect(calculateLevelFromXP(400)).toBe(3);
      expect(calculateLevelFromXP(3600)).toBe(7);
      expect(calculateLevelFromXP(12100)).toBe(12);
      expect(calculateLevelFromXP(36100)).toBe(20);
    });

    it("should return the exact XP threshold for each level", () => {
      expect(getXPThresholdForLevel(1)).toBe(0);
      expect(getXPThresholdForLevel(2)).toBe(100);
      expect(getXPThresholdForLevel(3)).toBe(400);
      expect(getXPThresholdForLevel(7)).toBe(3600);
      expect(getXPThresholdForLevel(12)).toBe(12100);
    });

    it("should compute detailed progression percentage and remaining XP", () => {
      const progress = getLevelProgress(250);
      expect(progress.currentLevel).toBe(2);
      expect(progress.nextLevel).toBe(3);
      expect(progress.currentLevelMinXP).toBe(100);
      expect(progress.nextLevelMinXP).toBe(400);
      expect(progress.xpIntoCurrentLevel).toBe(150);
      expect(progress.xpNeededForNextLevel).toBe(150);
      expect(progress.progressPercent).toBe(50);
    });

    it("should return appropriate detective rank titles", () => {
      expect(getRankTitle(1)).toBe("Junior Operative");
      expect(getRankTitle(3)).toBe("Field Investigator");
      expect(getRankTitle(7)).toBe("Senior Detective");
      expect(getRankTitle(12)).toBe("Lead Inspector");
      expect(getRankTitle(20)).toBe("Master Sleuth");
    });
  });

  describe("2. Zod Validation Schemas", () => {
    it("should validate a draft with minimal or partial fields", () => {
      const result = SaveSubmissionDraftSchema.safeParse({
        primaryCharacterId: MOCK_SUSPECT_ID,
        motive: "Financial blackmailing scheme",
      });
      expect(result.success).toBe(true);
    });

    it("should reject invalid UUIDs in draft schema", () => {
      const result = SaveSubmissionDraftSchema.safeParse({
        primaryCharacterId: "not-a-uuid",
      });
      expect(result.success).toBe(false);
    });

    it("should validate a complete final submission", () => {
      const validIndictment = {
        title: "The Midnight Protocol Indictment",
        primaryCharacterId: MOCK_SUSPECT_ID,
        motive: "Suspect embezzled funds and used blackmail to silence the victim.",
        method: "Administered cyanide poison via coffee cup during the server room access.",
        timelineSummary:
          "At midnight, the suspect breached server room 4B as verified by badge logs.",
        explanation:
          "Comprehensive analysis reveals that Marcus Thorne orchestrated the entire operation.",
        supportingEvidenceIds: [MOCK_CLUE_1, MOCK_CLUE_2],
        contradictingEvidenceIds: [MOCK_CLUE_CONTRADICT],
      };
      const result = FinalSubmissionSchema.safeParse(validIndictment);
      expect(result.success).toBe(true);
    });

    it("should reject final submission if motive or method is too short (< 10 chars)", () => {
      const invalid = {
        title: "Brief Indictment",
        primaryCharacterId: MOCK_SUSPECT_ID,
        motive: "Money",
        method: "Poison",
        timelineSummary: "Yesterday night at 10pm",
        explanation: "Marcus Thorne did it by poison.",
        supportingEvidenceIds: [MOCK_CLUE_1],
        contradictingEvidenceIds: [],
      };
      const result = FinalSubmissionSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it("should reject final submission without supporting evidence", () => {
      const invalid = {
        title: "No Evidence Indictment",
        primaryCharacterId: MOCK_SUSPECT_ID,
        motive: "Suspect embezzled funds and used blackmail to silence the victim.",
        method: "Administered cyanide poison via coffee cup during the server room access.",
        timelineSummary: "At midnight, the suspect breached server room 4B as verified by logs.",
        explanation: "Marcus Thorne is guilty based on our deduction without physical items.",
        supportingEvidenceIds: [],
        contradictingEvidenceIds: [],
      };
      const result = FinalSubmissionSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe("3. Submission Guard & Access Authorization", () => {
    it("should deny access if user is not an active participant of the investigation", async () => {
      vi.spyOn(prisma.user, "findUnique").mockResolvedValue({
        id: MOCK_USER_ID,
        profile: { id: MOCK_PROFILE_ID },
      } as any);

      vi.spyOn(prisma.investigation, "findUnique").mockResolvedValue(
        createMockInvestigation({
          participants: [], // No active participant matching MOCK_PROFILE_ID
        }) as any
      );

      await expect(
        SubmissionGuard.verifySubmissionAccess(MOCK_INVESTIGATION_ID, MOCK_USER_ID)
      ).rejects.toThrow("Operative is not an active participant in this investigation");
    });

    it("should deny access if squad is disbanded in a team investigation", async () => {
      vi.spyOn(prisma.user, "findUnique").mockResolvedValue({
        id: MOCK_USER_ID,
        profile: { id: MOCK_PROFILE_ID },
      } as any);

      vi.spyOn(prisma.investigation, "findUnique").mockResolvedValue(
        createMockInvestigation({
          teamId: "team-disbanded",
          team: {
            id: "team-disbanded",
            name: "Alpha Squad",
            status: TeamStatus.DISBANDED,
          },
        }) as any
      );

      await expect(
        SubmissionGuard.verifySubmissionAccess(MOCK_INVESTIGATION_ID, MOCK_USER_ID)
      ).rejects.toThrow("Investigation squad has been disbanded");
    });

    it("should forbid non-Lead Investigator from submitting final indictment in cooperative mode", () => {
      expect(() =>
        SubmissionGuard.verifySubmitPermission(PlayMode.COOPERATIVE, TeamRole.DETECTIVE)
      ).toThrow("Only the Lead Investigator of the squad has authority to submit");
    });

    it("should reject submission if suspect character does not belong to the case", async () => {
      vi.spyOn(prisma.caseCharacter, "findMany").mockResolvedValue([
        { id: MOCK_SUSPECT_ID },
      ] as any);

      await expect(
        SubmissionGuard.validateCharacterReferences(
          MOCK_CASE_ID,
          "00000000-0000-4000-a000-999999999999" // Nonexistent suspect
        )
      ).rejects.toThrow("is not registered in this case");
    });

    it("should reject submission if cited clues are not declassified in the investigation", async () => {
      vi.spyOn(prisma.clue, "findMany").mockResolvedValue([
        { id: MOCK_CLUE_1, clueCode: "CLUE-001" },
        { id: MOCK_CLUE_2, clueCode: "CLUE-002" },
      ] as any);

      // Only CLUE_1 is assigned
      vi.spyOn(prisma.clueAssignment, "findMany").mockResolvedValue([
        { clueId: MOCK_CLUE_1 },
      ] as any);
      vi.spyOn(prisma.evidenceShare, "findMany").mockResolvedValue([]);

      await expect(
        SubmissionGuard.validateEvidenceReferences(
          MOCK_INVESTIGATION_ID,
          MOCK_CASE_ID,
          MOCK_PROFILE_ID,
          PlayMode.SOLO,
          [MOCK_CLUE_1, MOCK_CLUE_2],
          []
        )
      ).rejects.toThrow("has not been declassified or assigned");
    });
  });

  describe("4. Evaluation Engine (Deterministic 6 Dimensions)", () => {
    it("should compute 100 points for a perfect indictment", () => {
      const answerData = {
        title: "The Midnight Protocol Indictment",
        primaryCharacterId: MOCK_SUSPECT_ID,
        additionalCharacterIds: [],
        motive:
          "Suspect committed embezzlement and used blackmail and extortion against the victim.",
        method: "Administered cyanide poison to induce cardiac arrest.",
        timelineSummary: "Action took place at midnight (23:45) inside the server room.",
        explanation: "Thorough forensics confirms Marcus Thorne's guilt.",
        supportingEvidenceIds: [MOCK_CLUE_1, MOCK_CLUE_2],
        contradictingEvidenceIds: [MOCK_CLUE_CONTRADICT],
        additionalFindings: "",
      };

      const caseClues = [
        { id: MOCK_CLUE_1, clueCode: "CLUE-001", title: "Flash Drive" },
        { id: MOCK_CLUE_2, clueCode: "CLUE-002", title: "Poison Vial" },
        { id: MOCK_CLUE_CONTRADICT, clueCode: "CLUE-ALIBI-001", title: "Badge Log" },
      ];

      const caseCharacters = [
        { id: MOCK_SUSPECT_ID, name: "Marcus Thorne" },
        { id: MOCK_INNOCENT_ID, name: "Elena Rostova" },
      ];

      const evaluation = EvaluationService.computeDeductiveScore(
        answerData,
        mockSolutionConfig as any,
        caseClues,
        caseCharacters
      );

      expect(evaluation.totalScore).toBe(100);
      expect(evaluation.isPassed).toBe(true);
      expect(evaluation.isPerfect).toBe(true);
      expect(evaluation.result).toBe(EvaluationResult.SOLVED_PERFECT);
      expect(evaluation.dimensions.primarySuspect.score).toBe(30);
      expect(evaluation.dimensions.motive.score).toBe(15);
      expect(evaluation.dimensions.method.score).toBe(15);
      expect(evaluation.dimensions.timeline.score).toBe(15);
      expect(evaluation.dimensions.supportingEvidence.score).toBe(15);
      expect(evaluation.dimensions.contradictingEvidence.score).toBe(10);
      expect(evaluation.correctConclusions.length).toBeGreaterThan(0);
    });

    it("should award 0 for primary suspect if wrong suspect is selected and mark INCORRECT", () => {
      const answerData = {
        title: "Faulty Indictment",
        primaryCharacterId: MOCK_INNOCENT_ID, // Wrong suspect
        additionalCharacterIds: [],
        motive: "Random speculation without matching keywords.",
        method: "Unknown method used.",
        timelineSummary: "Some time in the afternoon.",
        explanation: "Elena must be the culprit.",
        supportingEvidenceIds: [MOCK_CLUE_1],
        contradictingEvidenceIds: [],
        additionalFindings: "",
      };

      const caseClues = [
        { id: MOCK_CLUE_1, clueCode: "CLUE-001", title: "Flash Drive" },
        { id: MOCK_CLUE_2, clueCode: "CLUE-002", title: "Poison Vial" },
      ];

      const caseCharacters = [
        { id: MOCK_SUSPECT_ID, name: "Marcus Thorne" },
        { id: MOCK_INNOCENT_ID, name: "Elena Rostova" },
      ];

      const evaluation = EvaluationService.computeDeductiveScore(
        answerData,
        mockSolutionConfig as any,
        caseClues,
        caseCharacters
      );

      expect(evaluation.dimensions.primarySuspect.score).toBe(0);
      expect(evaluation.isSuspectCorrect).toBe(false);
      expect(evaluation.isPassed).toBe(false);
      expect(evaluation.result).toBe(EvaluationResult.INCORRECT);
      expect(evaluation.missedReasoningAreas.length).toBeGreaterThan(0);
    });

    it("should sanitize and never leak solutionConfig in evaluation feedback", () => {
      const answerData = {
        title: "Standard Indictment",
        primaryCharacterId: MOCK_SUSPECT_ID,
        additionalCharacterIds: [],
        motive: "Financial blackmailing scheme with extortion.",
        method: "Poison cyanide overdose.",
        timelineSummary: "At midnight in server room.",
        explanation: "Comprehensive analysis reveals Marcus Thorne acted alone.",
        supportingEvidenceIds: [MOCK_CLUE_1, MOCK_CLUE_2],
        contradictingEvidenceIds: [],
        additionalFindings: "",
      };

      const caseClues = [
        { id: MOCK_CLUE_1, clueCode: "CLUE-001", title: "Flash Drive" },
        { id: MOCK_CLUE_2, clueCode: "CLUE-002", title: "Poison Vial" },
      ];

      const caseCharacters = [{ id: MOCK_SUSPECT_ID, name: "Marcus Thorne" }];

      const evaluation = EvaluationService.computeDeductiveScore(
        answerData,
        mockSolutionConfig as any,
        caseClues,
        caseCharacters
      );

      // Verify returned feedback object never leaks raw solutionConfig
      expect((evaluation as any).solutionConfig).toBeUndefined();
      expect((evaluation as any).culpritSuspectId).toBeUndefined();
      expect(evaluation.dimensions).toBeDefined();
      expect(evaluation.feedbackSummary).toBeDefined();
    });
  });

  describe("5. Reward Service & XP Idempotency", () => {
    it("should award XP and record transaction with deterministic referenceKey", async () => {
      const mockTx = {
        xPTransaction: {
          findUnique: vi.fn().mockResolvedValue(null),
          create: vi.fn().mockResolvedValue({
            id: "tx-1",
            playerId: MOCK_PROFILE_ID,
            amount: 500,
            reason: "Case Solved: The Midnight Protocol",
            referenceKey: `xp:case_solve:${MOCK_INVESTIGATION_ID}:${MOCK_PROFILE_ID}`,
          }),
        },
        playerProfile: {
          update: vi.fn().mockResolvedValue({
            id: MOCK_PROFILE_ID,
            xp: 600,
            level: 3,
          }),
        },
      };

      const result = await RewardService.awardXP(mockTx as any, {
        playerId: MOCK_PROFILE_ID,
        amount: 500,
        reason: "Case Solved: The Midnight Protocol",
        investigationId: MOCK_INVESTIGATION_ID,
        referenceKey: `xp:case_solve:${MOCK_INVESTIGATION_ID}:${MOCK_PROFILE_ID}`,
      });

      expect(result.awarded).toBe(true);
      expect(result.amount).toBe(500);
      expect(mockTx.playerProfile.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: MOCK_PROFILE_ID },
          data: expect.objectContaining({
            xp: { increment: 500 },
          }),
        })
      );
      expect(mockTx.xPTransaction.create).toHaveBeenCalled();
    });

    it("should be idempotent: skip XP increment if referenceKey transaction already exists", async () => {
      const existingTx = {
        id: "tx-existing",
        playerId: MOCK_PROFILE_ID,
        amount: 500,
        reason: "Case Solved",
        referenceKey: `xp:case_solve:${MOCK_INVESTIGATION_ID}:${MOCK_PROFILE_ID}`,
      };

      const mockTx = {
        xPTransaction: {
          findUnique: vi.fn().mockResolvedValue(existingTx),
          create: vi.fn(),
        },
        playerProfile: {
          findUnique: vi.fn().mockResolvedValue({ id: MOCK_PROFILE_ID, xp: 500, level: 3 }),
          update: vi.fn(),
        },
      };

      const result = await RewardService.awardXP(mockTx as any, {
        playerId: MOCK_PROFILE_ID,
        amount: 500,
        reason: "Duplicate award attempt",
        investigationId: MOCK_INVESTIGATION_ID,
        referenceKey: `xp:case_solve:${MOCK_INVESTIGATION_ID}:${MOCK_PROFILE_ID}`,
      });

      expect(result.awarded).toBe(false);
      expect(mockTx.playerProfile.update).not.toHaveBeenCalled();
      expect(mockTx.xPTransaction.create).not.toHaveBeenCalled();
    });

    it("should unlock FIRST_CASE_SOLVED and PERFECT_INVESTIGATION achievements idempotently", async () => {
      const mockAchievementsInDb = [
        { id: "ach-1", code: "FIRST_CASE_SOLVED", title: "First Case Solved" },
        { id: "ach-2", code: "PERFECT_INVESTIGATION", title: "Flawless Deduction" },
      ];

      const mockTx = {
        achievement: {
          findMany: vi.fn().mockResolvedValue(mockAchievementsInDb),
        },
        userAchievement: {
          findMany: vi.fn().mockResolvedValue([]),
          create: vi.fn().mockResolvedValue({ id: "ua-1" }),
        },
        xPTransaction: {
          findUnique: vi.fn().mockResolvedValue(null),
          create: vi.fn().mockResolvedValue({ id: "tx-ach" }),
        },
        playerProfile: {
          findUnique: vi.fn().mockResolvedValue({ id: MOCK_PROFILE_ID, xp: 1000, level: 4 }),
          update: vi.fn().mockResolvedValue({ xp: 1000, level: 4 }),
        },
      };

      const unlocked = await RewardService.evaluateAndUnlockAchievements(mockTx as any, {
        playerId: MOCK_PROFILE_ID,
        investigationId: MOCK_INVESTIGATION_ID,
        score: 100,
        isPerfect: true,
        isCooperative: false,
        citedAllEvidence: true,
        allPuzzlesSolved: true,
      });

      expect(unlocked.length).toBe(2);
      expect(unlocked).toContain("FIRST_CASE_SOLVED");
      expect(unlocked).toContain("PERFECT_INVESTIGATION");
      expect(mockTx.userAchievement.create).toHaveBeenCalledTimes(2);
    });
  });

  describe("6. Submission Service Workflow & Immutability", () => {
    it("should save draft submission for an active investigation", async () => {
      vi.spyOn(prisma.user, "findUnique").mockResolvedValue({
        id: MOCK_USER_ID,
        profile: { id: MOCK_PROFILE_ID, codename: "OPERATIVE-7" },
      } as any);

      const mockInv = createMockInvestigation();
      vi.spyOn(prisma.investigation, "findUnique").mockResolvedValue(mockInv as any);
      vi.spyOn(prisma.caseCharacter, "findMany").mockResolvedValue([
        { id: MOCK_SUSPECT_ID },
      ] as any);
      vi.spyOn(prisma.caseSubmission, "findFirst").mockResolvedValue(null);
      vi.spyOn(prisma.caseSubmission, "create").mockResolvedValue({
        id: MOCK_SUBMISSION_ID,
        investigationId: MOCK_INVESTIGATION_ID,
        submittedById: MOCK_PROFILE_ID,
        title: "Investigative Indictment",
        answerData: {
          primaryCharacterId: MOCK_SUSPECT_ID,
          motive: "Suspect embezzled funds.",
        },
        status: SubmissionStatus.DRAFT,
        submittedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        submittedBy: { codename: "OPERATIVE-7" },
        evaluation: null,
      } as any);

      const draft = await SubmissionService.saveDraft(MOCK_INVESTIGATION_ID, MOCK_USER_ID, {
        title: "Investigative Indictment",
        primaryCharacterId: MOCK_SUSPECT_ID,
        motive: "Suspect embezzled funds.",
      } as any);

      expect(draft.id).toBe(MOCK_SUBMISSION_ID);
      expect(draft.status).toBe(SubmissionStatus.DRAFT);
    });

    it("should prevent modifications if investigation is already terminal", async () => {
      vi.spyOn(prisma.user, "findUnique").mockResolvedValue({
        id: MOCK_USER_ID,
        profile: { id: MOCK_PROFILE_ID },
      } as any);

      const mockInv = createMockInvestigation({
        status: InvestigationStatus.SOLVED,
      });
      vi.spyOn(prisma.investigation, "findUnique").mockResolvedValue(mockInv as any);

      await expect(
        SubmissionService.saveDraft(MOCK_INVESTIGATION_ID, MOCK_USER_ID, {
          title: "Late Draft",
        } as any)
      ).rejects.toThrow("Cannot modify submission: investigation is already concluded");
    });
  });

  describe("7. API Route Handlers", () => {
    it("GET /api/investigations/[investigationId]/submissions should return draft or null", async () => {
      vi.spyOn(authGuard, "requireAuthenticatedUser").mockResolvedValue(
        mockAuthenticatedUser as any
      );
      vi.spyOn(SubmissionService, "getSubmission").mockResolvedValue({
        id: MOCK_SUBMISSION_ID,
        investigationId: MOCK_INVESTIGATION_ID,
        submittedById: MOCK_PROFILE_ID,
        submittedByCodename: "AGENT-1",
        title: "Draft Indictment",
        answerData: {
          primaryCharacterId: MOCK_SUSPECT_ID,
        } as any,
        status: SubmissionStatus.DRAFT,
        submittedAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const req = new NextRequest("http://localhost:3000/api/investigations/inv-1/submissions");
      const res = await getSubmissionsRoute(req, {
        params: Promise.resolve({ investigationId: MOCK_INVESTIGATION_ID }),
      });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.ok).toBe(true);
      expect(json.data.submission).toBeDefined();
      expect(json.data.submission.id).toBe(MOCK_SUBMISSION_ID);
      expect(json.data.submission.status).toBe("DRAFT");
    });

    it("POST /api/investigations/[investigationId]/submissions should save draft successfully", async () => {
      vi.spyOn(authGuard, "requireAuthenticatedUser").mockResolvedValue(
        mockAuthenticatedUser as any
      );
      vi.spyOn(SubmissionService, "saveDraft").mockResolvedValue({
        id: MOCK_SUBMISSION_ID,
        investigationId: MOCK_INVESTIGATION_ID,
        submittedById: MOCK_PROFILE_ID,
        submittedByCodename: "AGENT-1",
        title: "Updated Draft",
        answerData: {
          primaryCharacterId: MOCK_SUSPECT_ID,
          motive: "Drafting motive",
        } as any,
        status: SubmissionStatus.DRAFT,
        submittedAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const req = new NextRequest("http://localhost:3000/api/investigations/inv-1/submissions", {
        method: "POST",
        body: JSON.stringify({
          title: "Updated Draft",
          primaryCharacterId: MOCK_SUSPECT_ID,
          motive: "Drafting motive",
        }),
      });

      const res = await saveDraftRoute(req, {
        params: Promise.resolve({ investigationId: MOCK_INVESTIGATION_ID }),
      });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.ok).toBe(true);
      expect(json.data.submission).toBeDefined();
      expect(json.data.submission.title).toBe("Updated Draft");
    });

    it("GET /api/player/progression should return player progression dossier", async () => {
      vi.spyOn(authGuard, "requireAuthenticatedUser").mockResolvedValue(
        mockAuthenticatedUser as any
      );
      vi.spyOn(ProgressionService, "getPlayerProgression").mockResolvedValue({
        playerId: MOCK_PROFILE_ID,
        codename: "GHOST",
        displayName: "Agent Ghost",
        totalXP: 1200,
        level: 4,
        rank: {
          minLevel: 3,
          title: "Field Investigator",
          badge: "INV-2",
          description: "Active operative",
          clearanceLevel: "LEVEL 2",
        },
        levelProgress: {
          currentLevel: 4,
          nextLevel: 5,
          totalXP: 1200,
          currentLevelMinXP: 900,
          nextLevelMinXP: 1600,
          xpIntoCurrentLevel: 300,
          xpNeededForNextLevel: 400,
          progressPercent: 43,
          rank: {} as any,
        },
        completedInvestigationsCount: 2,
        unlockedAchievementsCount: 3,
        totalAchievementsCount: 10,
        recentTransactions: [
          {
            id: "tx-1",
            amount: 500,
            reason: "Case Solved",
            referenceKey: "ref-1",
            investigationId: MOCK_INVESTIGATION_ID,
            createdAt: new Date().toISOString(),
          },
        ],
      });

      const req = new NextRequest("http://localhost:3000/api/player/progression");
      const res = await getProgressionRoute(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.ok).toBe(true);
      expect(json.data.progression).toBeDefined();
      expect(json.data.progression.totalXP).toBe(1200);
      expect(json.data.progression.level).toBe(4);
      expect(json.data.progression.recentTransactions.length).toBe(1);
    });

    it("GET /api/player/achievements should return unlocked and locked achievements", async () => {
      vi.spyOn(authGuard, "requireAuthenticatedUser").mockResolvedValue(
        mockAuthenticatedUser as any
      );
      vi.spyOn(ProgressionService, "getPlayerAchievements").mockResolvedValue([
        {
          id: "ach-1",
          code: "FIRST_CASE_SOLVED",
          title: "First Case Solved",
          description: "Solve your first case",
          iconUrl: null,
          category: "MILESTONES" as any,
          criteria: {},
          isUnlocked: true,
          unlockedAt: new Date().toISOString(),
        },
        {
          id: "ach-2",
          code: "MASTER_DETECTIVE",
          title: "Master Detective",
          description: "Reach level 20",
          iconUrl: null,
          category: "MASTERY" as any,
          criteria: {},
          isUnlocked: false,
          unlockedAt: null,
        },
      ]);

      const req = new NextRequest("http://localhost:3000/api/player/achievements");
      const res = await getAchievementsRoute(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.ok).toBe(true);
      expect(json.data.achievements.length).toBe(2);
      expect(json.data.achievements[0].isUnlocked).toBe(true);
      expect(json.data.achievements[1].isUnlocked).toBe(false);
    });
  });
});
