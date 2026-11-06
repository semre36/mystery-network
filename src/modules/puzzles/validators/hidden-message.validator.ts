import { AttemptStatus } from "@prisma/client";
import { BasePuzzleValidator } from "./base.validator";
import { PuzzleValidatorInput, ValidationOutcome } from "../types/puzzle.types";
import { normalizeAnswer } from "../utils/crypto.util";

export class HiddenMessageValidator extends BasePuzzleValidator {
  validate(input: PuzzleValidatorInput): ValidationOutcome {
    const { submittedAnswer, secretConfig, solutionHash } = input;

    // 1. Verify against explicit solutions or solutionHash
    const isMatch = this.verifyAgainstAcceptedSolutions(
      submittedAnswer,
      secretConfig,
      solutionHash,
      {
        stripPunctuation: true,
        collapseWhitespace: true,
      }
    );

    if (isMatch) {
      return {
        isCorrect: true,
        resultStatus: AttemptStatus.CORRECT,
        feedback: "Hidden message extracted successfully from the source record.",
      };
    }

    // 2. Check pattern extraction if configured (e.g. acrostic lines)
    if (Array.isArray(secretConfig?.acrosticLines)) {
      const extracted = secretConfig.acrosticLines.map((line: string) => line.trim()[0]).join("");
      const normalizedExtracted = normalizeAnswer(extracted);
      const normalizedSubmitted = normalizeAnswer(submittedAnswer);

      if (normalizedSubmitted === normalizedExtracted) {
        return {
          isCorrect: true,
          resultStatus: AttemptStatus.CORRECT,
          feedback: "Acrostic pattern correctly isolated and decoded.",
        };
      }
    }

    return {
      isCorrect: false,
      resultStatus: AttemptStatus.INCORRECT,
      feedback: "Extracted message does not match the hidden pattern in the evidence.",
    };
  }
}
