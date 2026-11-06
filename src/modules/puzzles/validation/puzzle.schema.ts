import { z } from "zod";

export const SubmitPuzzleAttemptSchema = z.object({
  answer: z
    .string()
    .trim()
    .min(1, "Answer cannot be empty")
    .max(5000, "Answer submission exceeds maximum allowable length"),
  stageId: z.string().uuid("Invalid stage identifier format").optional(),
});

export type SubmitPuzzleAttemptInput = z.infer<typeof SubmitPuzzleAttemptSchema>;

export const UnlockHintSchema = z.object({
  hintId: z.string().uuid("Invalid hint identifier format"),
});

export type UnlockHintInput = z.infer<typeof UnlockHintSchema>;
