import { AttemptStatus } from "@prisma/client";
import { BasePuzzleValidator } from "./base.validator";
import { PuzzleValidatorInput, ValidationOutcome } from "../types/puzzle.types";
import { normalizeAnswer } from "../utils/crypto.util";

export class LogicChallengeValidator extends BasePuzzleValidator {
  validate(input: PuzzleValidatorInput): ValidationOutcome {
    const { submittedAnswer, secretConfig, solutionHash } = input;

    // 1. Check against standard accepted solutions
    const isStandardMatch = this.verifyAgainstAcceptedSolutions(
      submittedAnswer,
      secretConfig,
      solutionHash,
      {
        stripPunctuation: false, // In logic challenges, delimiters like commas or colons may matter
        collapseWhitespace: true,
      }
    );

    if (isStandardMatch) {
      return {
        isCorrect: true,
        resultStatus: AttemptStatus.CORRECT,
        feedback: "Deduction sequence verified. All timeline constraints satisfied.",
      };
    }

    // 2. Structured sequence / ordering comparison
    // If expected sequence is an array of identifiers e.g. ["DOC", "ALPHA", "OMEGA", "DELTA"]
    const targetSeq = secretConfig?.expectedSequence || secretConfig?.targetSequence;
    if (Array.isArray(targetSeq)) {
      const expectedArray = targetSeq.map((item: string) => normalizeAnswer(String(item)));

      // Attempt parsing submittedAnswer as JSON array or comma/arrow-delimited string
      let submittedArray: string[] = [];
      try {
        const parsed = JSON.parse(submittedAnswer);
        if (Array.isArray(parsed)) {
          submittedArray = parsed.map((item) => normalizeAnswer(String(item)));
        }
      } catch {
        // Fallback: split by comma, hyphen, or arrow (->)
        submittedArray = submittedAnswer
          .split(/[,>\-\n|]+/)
          .map((item) => normalizeAnswer(item))
          .filter(Boolean);
      }

      if (
        submittedArray.length === expectedArray.length &&
        submittedArray.every((val, idx) => val === expectedArray[idx])
      ) {
        return {
          isCorrect: true,
          resultStatus: AttemptStatus.CORRECT,
          feedback: "Chronological sequence correctly ordered. Logical constraints validated.",
        };
      }
    }

    // 3. Key-Value mapping comparison (e.g. Suspect -> Role)
    if (
      secretConfig?.expectedPairs &&
      typeof secretConfig.expectedPairs === "object" &&
      !Array.isArray(secretConfig.expectedPairs)
    ) {
      try {
        const submittedPairs = JSON.parse(submittedAnswer);
        if (typeof submittedPairs === "object" && !Array.isArray(submittedPairs)) {
          const expectedPairs = secretConfig.expectedPairs;
          let allMatch = true;

          for (const [key, expectedVal] of Object.entries(expectedPairs)) {
            const userVal = submittedPairs[key] || submittedPairs[key.toLowerCase()];
            if (normalizeAnswer(String(userVal)) !== normalizeAnswer(String(expectedVal))) {
              allMatch = false;
              break;
            }
          }

          if (allMatch) {
            return {
              isCorrect: true,
              resultStatus: AttemptStatus.CORRECT,
              feedback: "Relational pairings verified against all operational constraints.",
            };
          }
        }
      } catch {
        // Not JSON formatted
      }
    }

    return {
      isCorrect: false,
      resultStatus: AttemptStatus.INCORRECT,
      feedback: "Logical deduction invalid. One or more relational constraints violated.",
    };
  }
}
