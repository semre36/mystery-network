import { AttemptStatus } from "@prisma/client";
import { BasePuzzleValidator } from "./base.validator";
import { PuzzleValidatorInput, ValidationOutcome } from "../types/puzzle.types";

export class AccessCodeValidator extends BasePuzzleValidator {
  validate(input: PuzzleValidatorInput): ValidationOutcome {
    const { submittedAnswer, secretConfig, solutionHash } = input;

    // Normalization: strip whitespace, uppercase, standard alphanumeric
    const isMatch = this.verifyAgainstAcceptedSolutions(
      submittedAnswer,
      secretConfig,
      solutionHash,
      {
        stripWhitespace: true,
        stripPunctuation: false, // Keep hyphens if terminal code has format e.g. TRM-9921
      }
    );

    if (isMatch) {
      return {
        isCorrect: true,
        resultStatus: AttemptStatus.CORRECT,
        feedback: "Terminal authorization code accepted. Access granted to secure node.",
      };
    }

    return {
      isCorrect: false,
      resultStatus: AttemptStatus.INCORRECT,
      feedback: "Access denied. Invalid security passcode or terminal token.",
    };
  }
}
