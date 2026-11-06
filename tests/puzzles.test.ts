import { describe, it, expect, vi, beforeEach } from "vitest";
import { PuzzleService } from "@/modules/puzzles/services/puzzle.service";
import { PuzzleGuard } from "@/modules/puzzles/guards/puzzle.guard";
import {
  normalizeAnswer,
  hashAnswer,
  verifyAnswerMatch,
} from "@/modules/puzzles/utils/crypto.util";
import { PuzzleValidatorRegistry } from "@/modules/puzzles/validators";
import { CaesarCipherValidator } from "@/modules/puzzles/validators/caesar.validator";
import { SubstitutionCipherValidator } from "@/modules/puzzles/validators/substitution.validator";
import { VigenereCipherValidator } from "@/modules/puzzles/validators/vigenere.validator";
import { HiddenMessageValidator } from "@/modules/puzzles/validators/hidden-message.validator";
import { LogicChallengeValidator } from "@/modules/puzzles/validators/logic-challenge.validator";
import { AccessCodeValidator } from "@/modules/puzzles/validators/access-code.validator";
import { GET as getPuzzlesRoute } from "@/app/api/investigations/[investigationId]/puzzles/route";
import { GET as getPuzzleDetailRoute } from "@/app/api/investigations/[investigationId]/puzzles/[puzzleId]/route";
import { POST as submitAttemptRoute } from "@/app/api/investigations/[investigationId]/puzzles/[puzzleId]/attempts/route";
import { POST as submitStageAttemptRoute } from "@/app/api/investigations/[investigationId]/puzzles/[puzzleId]/stages/[stageId]/attempts/route";
import { POST as unlockHintRoute } from "@/app/api/investigations/[investigationId]/puzzles/[puzzleId]/hints/[hintId]/unlock/route";
import * as authGuard from "@/modules/authentication/guards/auth.guard";
import { prisma } from "@/server/infrastructure/database";
import { AppError } from "@/lib/errors/app-error";
import {
  ContentStatus,
  PuzzleType,
  CaseDifficulty,
  AttemptStatus,
  PuzzleProgressStatus,
  ParticipantStatus,
  ChapterProgressStatus,
} from "@prisma/client";
import { NextRequest } from "next/server";

describe("Interactive Puzzle Engine & Investigation Challenges (Phase 10)", () => {
  const MOCK_USER_ID = "00000000-0000-4000-a000-000000000001";
  const MOCK_OTHER_USER_ID = "00000000-0000-4000-a000-000000000002";
  const MOCK_PROFILE_ID = "00000000-0000-4000-a000-000000000003";
  const MOCK_OTHER_PROFILE_ID = "00000000-0000-4000-a000-000000000004";
  const MOCK_CASE_ID = "00000000-0000-4000-a000-000000000005";
  const MOCK_CHAPTER_ID_1 = "00000000-0000-4000-a000-000000000006";
  const MOCK_CHAPTER_ID_2 = "00000000-0000-4000-a000-000000000007";
  const MOCK_INVESTIGATION_ID = "00000000-0000-4000-a000-000000000008";
  const MOCK_PUZZLE_ID_1 = "00000000-0000-4000-a000-000000000009";
  const MOCK_PUZZLE_ID_2 = "00000000-0000-4000-a000-00000000000a";
  const MOCK_MULTI_PUZZLE_ID = "00000000-0000-4000-a000-00000000000b";
  const MOCK_STAGE_ID_1 = "00000000-0000-4000-a000-00000000000c";
  const MOCK_STAGE_ID_2 = "00000000-0000-4000-a000-00000000000d";
  const MOCK_HINT_ID_1 = "00000000-0000-4000-a000-00000000000e";

  const mockAuthenticatedUser = {
    id: MOCK_USER_ID,
    telegramId: "123456789",
  };

  const createMockPuzzle = (overrides: Record<string, any> = {}) => ({
    id: MOCK_PUZZLE_ID_1,
    caseId: MOCK_CASE_ID,
    chapterId: MOCK_CHAPTER_ID_1,
    title: "The Shifted Message",
    description: "Decipher the intercepted transmission by rotating the characters.",
    instructions: "Standard Caesar cipher rotation.",
    puzzleType: PuzzleType.CAESAR_CIPHER,
    difficulty: CaseDifficulty.EASY,
    configuration: {},
    publicConfiguration: {
      ciphertext: "KHOOR ZRUOG",
      shiftHint: "A classical 3-step Caesar offset.",
    },
    secretConfiguration: {
      shift: 3,
      solution: "HELLO WORLD",
    },
    solutionHash: hashAnswer(
      normalizeAnswer("HELLO WORLD", { stripPunctuation: true, collapseWhitespace: true })
    ),
    unlockConditions: null,
    maxAttempts: 5,
    order: 1,
    isMultiStage: false,
    status: ContentStatus.PUBLISHED,
    createdAt: new Date("2026-11-06T08:00:00Z"),
    updatedAt: new Date("2026-11-06T08:00:00Z"),
    chapter: {
      id: MOCK_CHAPTER_ID_1,
      title: "Act 1: The Zurich Blackout",
      chapterOrder: 1,
    },
    stages: [],
    hints: [
      {
        id: MOCK_HINT_ID_1,
        puzzleId: MOCK_PUZZLE_ID_1,
        stageId: null,
        hintOrder: 1,
        title: "Historical Context",
        content: "Julius Caesar favored this simple offset technique.",
        unlockConditions: { minAttempts: 1 },
      },
    ],
    ...overrides,
  });

  const createMockInvestigation = (overrides: Record<string, any> = {}) => ({
    id: MOCK_INVESTIGATION_ID,
    caseId: MOCK_CASE_ID,
    status: "IN_PROGRESS",
    participants: [
      {
        id: "participant-1",
        playerId: MOCK_PROFILE_ID,
        status: ParticipantStatus.ACTIVE,
      },
    ],
    team: null,
    progress: [
      {
        chapterId: MOCK_CHAPTER_ID_1,
        status: ChapterProgressStatus.COMPLETED,
      },
      {
        chapterId: MOCK_CHAPTER_ID_2,
        status: ChapterProgressStatus.IN_PROGRESS,
      },
    ],
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(authGuard, "getCurrentUser").mockResolvedValue(mockAuthenticatedUser as any);
    vi.spyOn(authGuard, "requireAuthenticatedUser").mockResolvedValue(mockAuthenticatedUser as any);
  });

  // ==========================================================================
  // SECTION 1: Answer Normalization & Cryptographic Security
  // ==========================================================================
  describe("Cryptographic Utilities & Answer Normalization", () => {
    it("should normalize answers handling case, whitespace, and punctuation", () => {
      const raw = "  Hello,   World!  ";
      const normalized = normalizeAnswer(raw, {
        stripPunctuation: true,
        collapseWhitespace: true,
      });
      expect(normalized).toBe("HELLO WORLD");
    });

    it("should collapse spaces when requested without stripping punctuation", () => {
      const raw = "  TRM-9921   Code  ";
      const normalized = normalizeAnswer(raw, {
        stripPunctuation: false,
        collapseWhitespace: true,
      });
      expect(normalized).toBe("TRM-9921 CODE");
    });

    it("should strip all whitespace when stripWhitespace is true", () => {
      const sequence = " SUSPECT_B , SUSPECT_D , SUSPECT_A ";
      const normalized = normalizeAnswer(sequence, {
        stripWhitespace: true,
        stripPunctuation: false,
      });
      expect(normalized).toBe("SUSPECT_B,SUSPECT_D,SUSPECT_A");
    });

    it("should compute deterministic keyed HMAC-SHA256 hashes", () => {
      const hash1 = hashAnswer("HELLO WORLD");
      const hash2 = hashAnswer("HELLO WORLD");
      const hashDiff = hashAnswer("OTHER ANSWER");

      expect(hash1).toBe(hash2);
      expect(hash1).not.toBe(hashDiff);
      expect(hash1.length).toBe(64); // SHA-256 hex length
    });

    it("should perform timing-safe verification correctly", () => {
      const expectedHash = hashAnswer(normalizeAnswer("HELLO WORLD"));
      const isMatch = verifyAnswerMatch("hello world", expectedHash);
      const isMismatch = verifyAnswerMatch("wrong answer", expectedHash);

      expect(isMatch).toBe(true);
      expect(isMismatch).toBe(false);
    });
  });

  // ==========================================================================
  // SECTION 2: Challenge Type Validators
  // ==========================================================================
  describe("Challenge Type Validators", () => {
    it("CaesarCipherValidator: accepts correct plaintext and rejects wrong rotations", () => {
      const validator = new CaesarCipherValidator();
      const outcomeCorrect = validator.validate({
        submittedAnswer: "HELLO WORLD",
        publicConfig: { ciphertext: "KHOOR ZRUOG" },
        secretConfig: { shift: 3, solution: "HELLO WORLD" },
      });
      expect(outcomeCorrect.isCorrect).toBe(true);
      expect(outcomeCorrect.resultStatus).toBe(AttemptStatus.CORRECT);

      const outcomeIncorrect = validator.validate({
        submittedAnswer: "GOODBYE WORLD",
        publicConfig: { ciphertext: "KHOOR ZRUOG" },
        secretConfig: { shift: 3, solution: "HELLO WORLD" },
      });
      expect(outcomeIncorrect.isCorrect).toBe(false);
      expect(outcomeIncorrect.resultStatus).toBe(AttemptStatus.INCORRECT);
    });

    it("SubstitutionCipherValidator: validates monoalphabetic decrypted solutions", () => {
      const validator = new SubstitutionCipherValidator();
      const outcome = validator.validate({
        submittedAnswer: "the quick brown fox",
        publicConfig: { ciphertext: "ZIT JXOEA WKGVF YGB" },
        secretConfig: { solution: "THE QUICK BROWN FOX" },
      });
      expect(outcome.isCorrect).toBe(true);
      expect(outcome.resultStatus).toBe(AttemptStatus.CORRECT);
    });

    it("VigenereCipherValidator: validates solutions using keyword deciphering", () => {
      const validator = new VigenereCipherValidator();
      const outcome = validator.validate({
        submittedAnswer: "ATTACK AT DAWN",
        publicConfig: { ciphertext: "SATDQG SADDKJ", keywordLength: 6 },
        secretConfig: { keyword: "SHADOW", solution: "ATTACK AT DAWN" },
      });
      expect(outcome.isCorrect).toBe(true);
      expect(outcome.resultStatus).toBe(AttemptStatus.CORRECT);
    });

    it("HiddenMessageValidator: accepts extracted pattern messages", () => {
      const validator = new HiddenMessageValidator();
      const outcome = validator.validate({
        submittedAnswer: "ESCAPE NOW",
        publicConfig: { patternType: "ACROSTIC" },
        secretConfig: { solution: "ESCAPE NOW" },
      });
      expect(outcome.isCorrect).toBe(true);
      expect(outcome.resultStatus).toBe(AttemptStatus.CORRECT);
    });

    it("LogicChallengeValidator: accepts sequence order as comma-separated or array", () => {
      const validator = new LogicChallengeValidator();
      const outcomeComma = validator.validate({
        submittedAnswer: "SUSPECT_B,SUSPECT_D,SUSPECT_A,SUSPECT_C",
        publicConfig: {},
        secretConfig: {
          targetSequence: ["SUSPECT_B", "SUSPECT_D", "SUSPECT_A", "SUSPECT_C"],
        },
      });
      expect(outcomeComma.isCorrect).toBe(true);

      const outcomeWrongOrder = validator.validate({
        submittedAnswer: "SUSPECT_A,SUSPECT_B,SUSPECT_C,SUSPECT_D",
        publicConfig: {},
        secretConfig: {
          targetSequence: ["SUSPECT_B", "SUSPECT_D", "SUSPECT_A", "SUSPECT_C"],
        },
      });
      expect(outcomeWrongOrder.isCorrect).toBe(false);
    });

    it("AccessCodeValidator: accepts exact PIN and alphanumeric authorization tokens", () => {
      const validator = new AccessCodeValidator();
      const outcomePin = validator.validate({
        submittedAnswer: "7492",
        publicConfig: { codeFormat: "####" },
        secretConfig: { solution: "7492" },
      });
      expect(outcomePin.isCorrect).toBe(true);

      const outcomeToken = validator.validate({
        submittedAnswer: "trm-9921",
        publicConfig: { codeFormat: "TRM-####" },
        secretConfig: { solution: "TRM-9921" },
      });
      expect(outcomeToken.isCorrect).toBe(true);
    });

    it("Registry correctly dispatches to appropriate validator", () => {
      const validator = PuzzleValidatorRegistry.getValidator(PuzzleType.CAESAR_CIPHER);
      expect(validator).toBeInstanceOf(CaesarCipherValidator);
    });
  });

  // ==========================================================================
  // SECTION 3: Access Guard & Security
  // ==========================================================================
  describe("PuzzleGuard Access Control", () => {
    it("should reject unauthenticated requests or missing operative profile", async () => {
      vi.spyOn(prisma.playerProfile, "findUnique").mockResolvedValue(null);

      await expect(
        PuzzleGuard.verifyPuzzleAccess(MOCK_USER_ID, MOCK_INVESTIGATION_ID, MOCK_PUZZLE_ID_1)
      ).rejects.toThrow("Active investigator profile required");
    });

    it("should reject an operative who is not a participant in the investigation", async () => {
      vi.spyOn(prisma.playerProfile, "findUnique").mockResolvedValue({
        id: MOCK_PROFILE_ID,
        codename: "OPERATIVE_TEST",
      } as any);

      vi.spyOn(prisma.investigation, "findUnique").mockResolvedValue({
        id: MOCK_INVESTIGATION_ID,
        participants: [],
        team: null,
      } as any);

      await expect(
        PuzzleGuard.verifyPuzzleAccess(MOCK_USER_ID, MOCK_INVESTIGATION_ID, MOCK_PUZZLE_ID_1)
      ).rejects.toThrow("Investigation session not found or restricted");
    });

    it("should reject puzzle if assigned to a chapter that is not yet unlocked", async () => {
      vi.spyOn(prisma.playerProfile, "findUnique").mockResolvedValue({
        id: MOCK_PROFILE_ID,
        codename: "OPERATIVE_TEST",
      } as any);

      const investigation = createMockInvestigation({
        progress: [{ chapterId: MOCK_CHAPTER_ID_1, status: ChapterProgressStatus.LOCKED }],
      });

      vi.spyOn(prisma.investigation, "findUnique").mockResolvedValue(investigation as any);

      const puzzle = createMockPuzzle();
      vi.spyOn(prisma.puzzle, "findUnique").mockResolvedValue(puzzle as any);

      await expect(
        PuzzleGuard.verifyPuzzleAccess(MOCK_USER_ID, MOCK_INVESTIGATION_ID, MOCK_PUZZLE_ID_1)
      ).rejects.toThrow("locked in an unrevealed chapter");
    });
  });

  // ==========================================================================
  // SECTION 4: Puzzle Service & Progress Tracking
  // ==========================================================================
  describe("PuzzleService Business Logic", () => {
    it("getPuzzles: scrubs secretConfiguration and returns safe summaries with progress", async () => {
      vi.spyOn(prisma.playerProfile, "findUnique").mockResolvedValue({
        id: MOCK_PROFILE_ID,
        codename: "OPERATIVE_TEST",
      } as any);

      const mockInv = createMockInvestigation();
      vi.spyOn(prisma.investigation, "findUnique").mockResolvedValue(mockInv as any);

      const mockPuzzle = createMockPuzzle();
      vi.spyOn(prisma.puzzle, "findMany").mockResolvedValue([mockPuzzle] as any);
      vi.spyOn(prisma.puzzleProgress, "findMany").mockResolvedValue([]);
      vi.spyOn(prisma.puzzleAttempt, "groupBy").mockResolvedValue([]);

      const puzzles = await PuzzleService.getPuzzles(MOCK_USER_ID, MOCK_INVESTIGATION_ID);

      expect(puzzles).toHaveLength(1);
      const summary = puzzles[0];
      expect(summary.title).toBe("The Shifted Message");
      expect((summary as any).secretConfiguration).toBeUndefined();
      expect((summary as any).solutionHash).toBeUndefined();
      expect(summary.progressStatus).toBe(PuzzleProgressStatus.UNLOCKED);
    });

    it("submitAttempt: records attempt, enforces maxAttempts lockout, and returns 429 when exhausted", async () => {
      vi.spyOn(prisma.playerProfile, "findUnique").mockResolvedValue({
        id: MOCK_PROFILE_ID,
        codename: "OPERATIVE_TEST",
      } as any);

      const mockInv = createMockInvestigation();
      vi.spyOn(prisma.investigation, "findUnique").mockResolvedValue(mockInv as any);

      const mockPuzzle = createMockPuzzle({ maxAttempts: 3 });
      vi.spyOn(prisma.puzzle, "findUnique").mockResolvedValue(mockPuzzle as any);

      // Simulate player already reached 3 attempts
      const mockTx = {
        $executeRaw: vi.fn().mockResolvedValue(1),
        puzzleAttempt: {
          count: vi.fn().mockResolvedValue(3),
          create: vi.fn(),
        },
        puzzleProgress: {
          findUnique: vi.fn().mockResolvedValue(null),
          create: vi.fn().mockResolvedValue({
            id: "prog-1",
            status: PuzzleProgressStatus.IN_PROGRESS,
            currentStageOrder: 1,
          }),
          update: vi.fn(),
        },
      };

      vi.spyOn(prisma, "$transaction").mockImplementation(async (cb: any) => {
        return cb(mockTx);
      });

      await expect(
        PuzzleService.submitAttempt(MOCK_USER_ID, MOCK_INVESTIGATION_ID, MOCK_PUZZLE_ID_1, {
          answer: "WRONG ANSWER",
        })
      ).rejects.toThrow("Maximum submission attempts exceeded");
    });

    it("submitAttempt: successfully solves puzzle and marks PuzzleProgress as SOLVED", async () => {
      vi.spyOn(prisma.playerProfile, "findUnique").mockResolvedValue({
        id: MOCK_PROFILE_ID,
        codename: "OPERATIVE_TEST",
      } as any);

      const mockInv = createMockInvestigation();
      vi.spyOn(prisma.investigation, "findUnique").mockResolvedValue(mockInv as any);

      const mockPuzzle = createMockPuzzle({ maxAttempts: 5 });
      vi.spyOn(prisma.puzzle, "findUnique").mockResolvedValue(mockPuzzle as any);

      const mockProgress = {
        id: "progress-1",
        puzzleId: MOCK_PUZZLE_ID_1,
        investigationId: MOCK_INVESTIGATION_ID,
        status: PuzzleProgressStatus.IN_PROGRESS,
        currentStageOrder: 1,
      };

      const mockTx = {
        $executeRaw: vi.fn().mockResolvedValue(1),
        puzzleAttempt: {
          count: vi.fn().mockResolvedValue(0),
          create: vi.fn().mockResolvedValue({ id: "att-1" }),
        },
        puzzleProgress: {
          findUnique: vi.fn().mockResolvedValue(mockProgress),
          create: vi.fn(),
          update: vi.fn().mockResolvedValue({
            ...mockProgress,
            status: PuzzleProgressStatus.SOLVED,
          }),
        },
      };

      vi.spyOn(prisma, "$transaction").mockImplementation(async (cb: any) => {
        return cb(mockTx);
      });

      const result = await PuzzleService.submitAttempt(
        MOCK_USER_ID,
        MOCK_INVESTIGATION_ID,
        MOCK_PUZZLE_ID_1,
        {
          answer: "HELLO WORLD",
        }
      );

      expect(result.isCorrect).toBe(true);
      expect(result.isPuzzleCompleted).toBe(true);
      expect(mockTx.puzzleProgress.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: PuzzleProgressStatus.SOLVED,
          }),
        })
      );
    });

    it("unlockHint: verifies minAttempts condition and unlocks hint", async () => {
      vi.spyOn(prisma.playerProfile, "findUnique").mockResolvedValue({
        id: MOCK_PROFILE_ID,
        codename: "OPERATIVE_TEST",
      } as any);

      const mockInv = createMockInvestigation();
      vi.spyOn(prisma.investigation, "findUnique").mockResolvedValue(mockInv as any);

      const mockPuzzle = createMockPuzzle();
      vi.spyOn(prisma.puzzle, "findUnique").mockResolvedValue(mockPuzzle as any);

      // Condition: minAttempts is 1. If player has 0 attempts -> fails
      vi.spyOn(prisma.puzzleAttempt, "count").mockResolvedValue(0);

      await expect(
        PuzzleService.unlockHint(
          MOCK_USER_ID,
          MOCK_INVESTIGATION_ID,
          MOCK_PUZZLE_ID_1,
          MOCK_HINT_ID_1
        )
      ).rejects.toThrow("tactical hint unlocks after 1 attempts");

      // Now with 1 attempt -> succeeds and unlocks hint
      vi.spyOn(prisma.puzzleAttempt, "count").mockResolvedValue(1);
      vi.spyOn(prisma.investigationUnlockedHint, "create").mockResolvedValue({
        id: "unlocked-1",
        investigationId: MOCK_INVESTIGATION_ID,
        hintId: MOCK_HINT_ID_1,
        unlockedByPlayerId: MOCK_PROFILE_ID,
        unlockedAt: new Date(),
      } as any);

      const unlocked = await PuzzleService.unlockHint(
        MOCK_USER_ID,
        MOCK_INVESTIGATION_ID,
        MOCK_PUZZLE_ID_1,
        MOCK_HINT_ID_1
      );

      expect(unlocked.isUnlocked).toBe(true);
      expect(unlocked.content).toBe("Julius Caesar favored this simple offset technique.");
    });
  });

  // ==========================================================================
  // SECTION 5: Multi-Stage Puzzles Progression
  // ==========================================================================
  describe("Multi-Stage Puzzles", () => {
    it("solving Stage 1 advances currentStageOrder to Stage 2 and keeps puzzle IN_PROGRESS", async () => {
      vi.spyOn(prisma.playerProfile, "findUnique").mockResolvedValue({
        id: MOCK_PROFILE_ID,
        codename: "OPERATIVE_TEST",
      } as any);

      const mockInv = createMockInvestigation();
      vi.spyOn(prisma.investigation, "findUnique").mockResolvedValue(mockInv as any);

      const multiStagePuzzle = createMockPuzzle({
        id: MOCK_MULTI_PUZZLE_ID,
        isMultiStage: true,
        puzzleType: PuzzleType.MULTI_STAGE,
        stages: [
          {
            id: MOCK_STAGE_ID_1,
            puzzleId: MOCK_MULTI_PUZZLE_ID,
            stageOrder: 1,
            title: "Stage 1",
            instructions: "PIN",
            puzzleType: PuzzleType.ACCESS_CODE,
            publicConfiguration: {},
            secretConfiguration: { solution: "7492" },
            solutionHash: null,
            maxAttempts: 5,
          },
          {
            id: MOCK_STAGE_ID_2,
            puzzleId: MOCK_MULTI_PUZZLE_ID,
            stageOrder: 2,
            title: "Stage 2",
            instructions: "Token",
            puzzleType: PuzzleType.ACCESS_CODE,
            publicConfiguration: {},
            secretConfiguration: { solution: "TRM-9921" },
            solutionHash: null,
            maxAttempts: 5,
          },
        ],
      });

      vi.spyOn(prisma.puzzle, "findUnique").mockResolvedValue(multiStagePuzzle as any);

      const mockProgress = {
        id: "progress-multi",
        puzzleId: MOCK_MULTI_PUZZLE_ID,
        investigationId: MOCK_INVESTIGATION_ID,
        status: PuzzleProgressStatus.IN_PROGRESS,
        currentStageOrder: 1,
      };

      const mockTx = {
        $executeRaw: vi.fn().mockResolvedValue(1),
        puzzleAttempt: {
          count: vi.fn().mockResolvedValue(0),
          create: vi.fn().mockResolvedValue({ id: "att-stage-1" }),
        },
        puzzleProgress: {
          findUnique: vi.fn().mockResolvedValue(mockProgress),
          create: vi.fn(),
          update: vi.fn().mockResolvedValue({
            ...mockProgress,
            currentStageOrder: 2,
          }),
        },
      };

      vi.spyOn(prisma, "$transaction").mockImplementation(async (cb: any) => {
        return cb(mockTx);
      });

      const outcome = await PuzzleService.submitAttempt(
        MOCK_USER_ID,
        MOCK_INVESTIGATION_ID,
        MOCK_MULTI_PUZZLE_ID,
        {
          answer: "7492",
          stageId: MOCK_STAGE_ID_1,
        }
      );

      expect(outcome.isCorrect).toBe(true);
      expect(outcome.isStageCompleted).toBe(true);
      expect(outcome.isPuzzleCompleted).toBe(false);
      expect(outcome.nextStageOrder).toBe(2);
      expect(mockTx.puzzleProgress.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            currentStageOrder: 2,
          }),
        })
      );
    });
  });

  // ==========================================================================
  // SECTION 6: API Route Handlers
  // ==========================================================================
  describe("API Route Handlers", () => {
    it("GET /api/investigations/[investigationId]/puzzles returns 200 with puzzles", async () => {
      vi.spyOn(PuzzleService, "getPuzzles").mockResolvedValue([createMockPuzzle() as any]);

      const req = new NextRequest("http://localhost:3000/api/investigations/123/puzzles");
      const res = await getPuzzlesRoute(req, {
        params: Promise.resolve({ investigationId: MOCK_INVESTIGATION_ID }),
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(json.data.puzzles).toHaveLength(1);
    });

    it("POST /api/investigations/[investigationId]/puzzles/[puzzleId]/attempts submits answer", async () => {
      vi.spyOn(PuzzleService, "submitAttempt").mockResolvedValue({
        isCorrect: true,
        resultStatus: AttemptStatus.CORRECT,
        remainingAttempts: 4,
        attemptsUsed: 1,
        currentStageOrder: 1,
        completedAt: new Date().toISOString(),
        isStageCompleted: true,
        isPuzzleCompleted: true,
        nextStageOrder: null,
        feedback: "Puzzle solved successfully",
      });

      const req = new NextRequest(
        "http://localhost:3000/api/investigations/123/puzzles/456/attempts",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ answer: "HELLO WORLD" }),
        }
      );

      const res = await submitAttemptRoute(req, {
        params: Promise.resolve({
          investigationId: MOCK_INVESTIGATION_ID,
          puzzleId: MOCK_PUZZLE_ID_1,
        }),
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(json.data.isCorrect).toBe(true);
    });

    it("POST /api/investigations/[investigationId]/puzzles/[puzzleId]/hints/[hintId]/unlock discloses hint", async () => {
      vi.spyOn(PuzzleService, "unlockHint").mockResolvedValue({
        id: MOCK_HINT_ID_1,
        puzzleId: MOCK_PUZZLE_ID_1,
        stageId: null,
        hintOrder: 1,
        title: "Historical Context",
        content: "Decrypted hint content.",
        isUnlocked: true,
        unlockConditions: { minAttempts: 1 },
      });

      const req = new NextRequest(
        "http://localhost:3000/api/investigations/123/puzzles/456/hints/789/unlock",
        {
          method: "POST",
        }
      );

      const res = await unlockHintRoute(req, {
        params: Promise.resolve({
          investigationId: MOCK_INVESTIGATION_ID,
          puzzleId: MOCK_PUZZLE_ID_1,
          hintId: MOCK_HINT_ID_1,
        }),
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(json.data.isUnlocked).toBe(true);
      expect(json.data.content).toBe("Decrypted hint content.");
    });
  });
});
