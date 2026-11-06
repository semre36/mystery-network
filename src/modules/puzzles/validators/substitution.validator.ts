import { AttemptStatus } from "@prisma/client";
import { BasePuzzleValidator } from "./base.validator";
import { PuzzleValidatorInput, ValidationOutcome } from "../types/puzzle.types";
import { normalizeAnswer } from "../utils/crypto.util";

export class SubstitutionCipherValidator extends BasePuzzleValidator {
  /**
   * Helper function to decode ciphertext using an alphabet substitution map.
   */
  public static decodeSubstitution(
    ciphertext: string,
    mapping: Record<string, string> // e.g. { "X": "E", "Q": "T" }
  ): string {
    const upperMap: Record<string, string> = {};
    for (const [k, v] of Object.entries(mapping)) {
      upperMap[k.toUpperCase()] = v.toUpperCase();
    }

    return ciphertext
      .split("")
      .map((ch) => {
        const u = ch.toUpperCase();
        if (upperMap[u]) {
          return ch === ch.toLowerCase() ? upperMap[u].toLowerCase() : upperMap[u];
        }
        return ch;
      })
      .join("");
  }

  validate(input: PuzzleValidatorInput): ValidationOutcome {
    const { submittedAnswer, publicConfig, secretConfig, solutionHash } = input;

    // 1. Check against explicit secret solutions or solutionHash
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
        feedback: "Cipher substitution verified. Encrypted document decoded successfully.",
      };
    }

    // 2. Check mapping in secret configuration
    const mapping = secretConfig?.substitutionMap;
    const encoded = publicConfig?.encodedPrompt || publicConfig?.encodedMessage;

    if (mapping && typeof mapping === "object" && typeof encoded === "string") {
      const decodedTarget = SubstitutionCipherValidator.decodeSubstitution(encoded, mapping);
      const normalizedSubmitted = normalizeAnswer(submittedAnswer, {
        stripPunctuation: true,
        collapseWhitespace: true,
      });
      const normalizedTarget = normalizeAnswer(decodedTarget, {
        stripPunctuation: true,
        collapseWhitespace: true,
      });

      if (normalizedSubmitted === normalizedTarget) {
        return {
          isCorrect: true,
          resultStatus: AttemptStatus.CORRECT,
          feedback: "Substitution key successfully applied. Plaintext recovered.",
        };
      }
    }

    return {
      isCorrect: false,
      resultStatus: AttemptStatus.INCORRECT,
      feedback: "Decoded text does not match the frequency substitution key.",
    };
  }
}
