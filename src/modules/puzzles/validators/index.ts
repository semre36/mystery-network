import { PuzzleType } from "@prisma/client";
import { IPuzzleValidator } from "./base.validator";
import { CaesarCipherValidator } from "./caesar.validator";
import { SubstitutionCipherValidator } from "./substitution.validator";
import { VigenereCipherValidator } from "./vigenere.validator";
import { HiddenMessageValidator } from "./hidden-message.validator";
import { LogicChallengeValidator } from "./logic-challenge.validator";
import { AccessCodeValidator } from "./access-code.validator";

export * from "./base.validator";
export * from "./caesar.validator";
export * from "./substitution.validator";
export * from "./vigenere.validator";
export * from "./hidden-message.validator";
export * from "./logic-challenge.validator";
export * from "./access-code.validator";

export class PuzzleValidatorRegistry {
  private static validators: Map<string, IPuzzleValidator> = new Map();

  static {
    const caesar = new CaesarCipherValidator();
    const substitution = new SubstitutionCipherValidator();
    const vigenere = new VigenereCipherValidator();
    const hidden = new HiddenMessageValidator();
    const logic = new LogicChallengeValidator();
    const accessCode = new AccessCodeValidator();

    // Map exact puzzle types
    this.validators.set(PuzzleType.CAESAR_CIPHER, caesar);
    this.validators.set(PuzzleType.SUBSTITUTION_CIPHER, substitution);
    this.validators.set(PuzzleType.VIGENERE_CIPHER, vigenere);
    this.validators.set(PuzzleType.HIDDEN_MESSAGE, hidden);
    this.validators.set(PuzzleType.LOGIC_CHALLENGE, logic);
    this.validators.set(PuzzleType.LOGIC_GRID, logic);
    this.validators.set(PuzzleType.ACCESS_CODE, accessCode);
    this.validators.set(PuzzleType.DECODER_WHEEL, caesar);
    this.validators.set(PuzzleType.PATTERN_MATCH, hidden);
    this.validators.set(PuzzleType.CROSS_REFERENCE, logic);
    this.validators.set(PuzzleType.MULTI_STAGE, accessCode); // default stage fallback

    // Legacy general CIPHER type
    this.validators.set(PuzzleType.CIPHER, caesar);
  }

  /**
   * Resolves the appropriate validator for a puzzle type and its configuration.
   */
  public static getValidator(puzzleType: PuzzleType, config?: any): IPuzzleValidator {
    // If puzzleType is generic CIPHER, inspect configuration for specific subtype
    if (puzzleType === PuzzleType.CIPHER && config?.cipherType) {
      const sub = String(config.cipherType).toUpperCase();
      if (sub === "SUBSTITUTION") return this.validators.get(PuzzleType.SUBSTITUTION_CIPHER)!;
      if (sub === "VIGENERE") return this.validators.get(PuzzleType.VIGENERE_CIPHER)!;
      return this.validators.get(PuzzleType.CAESAR_CIPHER)!;
    }

    const validator = this.validators.get(puzzleType);
    if (!validator) {
      // Default fallback validator
      return this.validators.get(PuzzleType.ACCESS_CODE)!;
    }
    return validator;
  }
}
