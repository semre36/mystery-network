import { AttemptStatus } from "@prisma/client";
import { BasePuzzleValidator } from "./base.validator";
import { PuzzleValidatorInput, ValidationOutcome } from "../types/puzzle.types";
import { normalizeAnswer } from "../utils/crypto.util";

export class VigenereCipherValidator extends BasePuzzleValidator {
  /**
   * Helper function to decode ciphertext using a Vigenère keyword.
   */
  public static decodeVigenere(ciphertext: string, keyword: string): string {
    const cleanKey = keyword.toUpperCase().replace(/[^A-Z]/g, "");
    if (!cleanKey) return ciphertext;

    let keyIndex = 0;
    return ciphertext
      .split("")
      .map((char) => {
        const code = char.charCodeAt(0);
        if (code >= 65 && code <= 90) {
          // Uppercase
          const shift = cleanKey.charCodeAt(keyIndex % cleanKey.length) - 65;
          keyIndex++;
          return String.fromCharCode(((code - 65 - shift + 26) % 26) + 65);
        } else if (code >= 97 && code <= 122) {
          // Lowercase
          const shift = cleanKey.charCodeAt(keyIndex % cleanKey.length) - 65;
          keyIndex++;
          return String.fromCharCode(((code - 97 - shift + 26) % 26) + 97);
        }
        return char;
      })
      .join("");
  }

  validate(input: PuzzleValidatorInput): ValidationOutcome {
    const { submittedAnswer, publicConfig, secretConfig, solutionHash } = input;

    // 1. Verify against explicit solutions or hash
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
        feedback: "Polyalphabetic cipher decrypted. Cipher key confirmed.",
      };
    }

    // 2. If the secretConfig defines a keyword, check if player submitted decoded message OR the keyword itself
    const keyword = secretConfig?.keyword;
    const encoded = publicConfig?.encodedPrompt || publicConfig?.encodedMessage;

    if (typeof keyword === "string") {
      const normalizedSubmitted = normalizeAnswer(submittedAnswer, {
        stripPunctuation: true,
        collapseWhitespace: true,
      });

      // Check if player submitted the keyword itself
      const normalizedKey = normalizeAnswer(keyword, {
        stripPunctuation: true,
        collapseWhitespace: true,
      });
      if (normalizedSubmitted === normalizedKey) {
        return {
          isCorrect: true,
          resultStatus: AttemptStatus.CORRECT,
          feedback: "Correct cipher passkey identified.",
        };
      }

      // Check if player submitted the decoded plaintext using this keyword
      if (typeof encoded === "string") {
        const decodedTarget = VigenereCipherValidator.decodeVigenere(encoded, keyword);
        const normalizedTarget = normalizeAnswer(decodedTarget, {
          stripPunctuation: true,
          collapseWhitespace: true,
        });

        if (normalizedSubmitted === normalizedTarget) {
          return {
            isCorrect: true,
            resultStatus: AttemptStatus.CORRECT,
            feedback: "Vigenère polyalphabetic cipher successfully deciphered.",
          };
        }
      }
    }

    return {
      isCorrect: false,
      resultStatus: AttemptStatus.INCORRECT,
      feedback: "Decryption failed. The passkey or decrypted message is invalid.",
    };
  }
}
