import { AttemptStatus } from "@prisma/client";
import { BasePuzzleValidator } from "./base.validator";
import { PuzzleValidatorInput, ValidationOutcome } from "../types/puzzle.types";
import { normalizeAnswer } from "../utils/crypto.util";

export class CaesarCipherValidator extends BasePuzzleValidator {
  /**
   * Helper function to perform a Caesar rotation shift on ASCII text.
   */
  public static decodeCaesar(text: string, shift: number): string {
    const s = ((shift % 26) + 26) % 26;
    return text
      .split("")
      .map((char) => {
        const code = char.charCodeAt(0);
        // Uppercase letters (A-Z: 65-90)
        if (code >= 65 && code <= 90) {
          return String.fromCharCode(((code - 65 - s + 26) % 26) + 65);
        }
        // Lowercase letters (a-z: 97-122)
        if (code >= 97 && code <= 122) {
          return String.fromCharCode(((code - 97 - s + 26) % 26) + 97);
        }
        return char;
      })
      .join("");
  }

  validate(input: PuzzleValidatorInput): ValidationOutcome {
    const { submittedAnswer, publicConfig, secretConfig, solutionHash } = input;

    // 1. Check against explicit secret config or hash
    const isCorrect = this.verifyAgainstAcceptedSolutions(
      submittedAnswer,
      secretConfig,
      solutionHash,
      {
        stripPunctuation: true,
        collapseWhitespace: true,
      }
    );

    if (isCorrect) {
      return {
        isCorrect: true,
        resultStatus: AttemptStatus.CORRECT,
        feedback: "Transmission decrypted successfully. Message coordinates verified.",
      };
    }

    // 2. If shift is defined in configuration and encodedPrompt exists, check mathematically decoded text
    const shift = secretConfig?.shift ?? publicConfig?.shift;
    const encoded = publicConfig?.encodedPrompt || publicConfig?.encodedMessage;

    if (typeof shift === "number" && typeof encoded === "string") {
      const decodedTarget = CaesarCipherValidator.decodeCaesar(encoded, shift);
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
          feedback: "Caesar rotation calculated correctly. Decrypted message verified.",
        };
      }
    }

    // 3. If puzzle asks for the shift integer itself
    if (typeof shift === "number" && submittedAnswer.trim() === String(shift)) {
      return {
        isCorrect: true,
        resultStatus: AttemptStatus.CORRECT,
        feedback: "Correct rotation shift offset identified.",
      };
    }

    return {
      isCorrect: false,
      resultStatus: AttemptStatus.INCORRECT,
      feedback: "Decryption failed. Rotation offset or decrypted plaintext does not match.",
    };
  }
}
