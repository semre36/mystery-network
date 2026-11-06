import { AttemptStatus } from "@prisma/client";
import {
  PuzzleValidatorInput,
  ValidationOutcome,
  NormalizationOptions,
} from "../types/puzzle.types";
import { normalizeAnswer, verifyAnswerMatch, hashAnswer } from "../utils/crypto.util";

export interface IPuzzleValidator {
  validate(input: PuzzleValidatorInput): ValidationOutcome;
}

export abstract class BasePuzzleValidator implements IPuzzleValidator {
  abstract validate(input: PuzzleValidatorInput): ValidationOutcome;

  /**
   * Helper to verify exact plaintext solution or solutionHash with normalization.
   */
  protected verifyAgainstAcceptedSolutions(
    submitted: string,
    secretConfig: any,
    solutionHash?: string | null,
    defaultOptions: NormalizationOptions = {}
  ): boolean {
    const options: NormalizationOptions = {
      caseSensitive: secretConfig?.caseSensitive ?? defaultOptions.caseSensitive ?? false,
      stripWhitespace: secretConfig?.stripWhitespace ?? defaultOptions.stripWhitespace ?? false,
      stripPunctuation: secretConfig?.stripPunctuation ?? defaultOptions.stripPunctuation ?? true,
      collapseWhitespace:
        secretConfig?.collapseWhitespace ?? defaultOptions.collapseWhitespace ?? true,
    };

    const normalizedSubmitted = normalizeAnswer(submitted, options);

    // 1. Direct solution in secretConfig (string)
    if (typeof secretConfig?.solution === "string") {
      const normalizedExpected = normalizeAnswer(secretConfig.solution, options);
      if (normalizedSubmitted === normalizedExpected) {
        return true;
      }
    }

    // 2. Multiple accepted answers in secretConfig (array)
    if (Array.isArray(secretConfig?.acceptedAnswers)) {
      for (const accepted of secretConfig.acceptedAnswers) {
        if (typeof accepted === "string") {
          const normalizedAccepted = normalizeAnswer(accepted, options);
          if (normalizedSubmitted === normalizedAccepted) {
            return true;
          }
        }
      }
    }

    // 3. Solution hash verification using HMAC-SHA256
    const salt = secretConfig?.salt || "";
    if (solutionHash) {
      // Check if hash matches
      const isMatch = verifyAnswerMatch(submitted, solutionHash, salt, options);
      if (isMatch) return true;

      // Also check standard unsalted sha256 for backwards compatibility with legacy seed hashes
      const legacySha256 = require("crypto")
        .createHash("sha256")
        .update(normalizedSubmitted)
        .digest("hex");
      if (legacySha256.toLowerCase() === solutionHash.toLowerCase()) {
        return true;
      }
    }

    return false;
  }
}
