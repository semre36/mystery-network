import { z } from "zod";

const UUID_SCHEMA = z.string().uuid("Invalid identifier format");

/**
 * Schema for saving a draft submission (permissive for work-in-progress).
 */
export const SaveSubmissionDraftSchema = z.object({
  title: z.string().trim().max(120).optional().default("Investigative Indictment"),
  primaryCharacterId: z
    .union([UUID_SCHEMA, z.literal("")])
    .optional()
    .nullable(),
  additionalCharacterIds: z.array(UUID_SCHEMA).optional().default([]),
  motive: z.string().max(3000).optional().default(""),
  method: z.string().max(3000).optional().default(""),
  timelineSummary: z.string().max(3000).optional().default(""),
  explanation: z.string().max(5000).optional().default(""),
  supportingEvidenceIds: z.array(UUID_SCHEMA).optional().default([]),
  contradictingEvidenceIds: z.array(UUID_SCHEMA).optional().default([]),
  additionalFindings: z.string().max(2000).optional().default(""),
});

export type SaveSubmissionDraftInput = z.infer<typeof SaveSubmissionDraftSchema>;

/**
 * Strict schema for formal case submission & final indictment.
 */
export const FinalSubmissionSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, "Indictment title must be at least 3 characters")
    .max(120, "Title must not exceed 120 characters"),
  primaryCharacterId: UUID_SCHEMA,
  additionalCharacterIds: z.array(UUID_SCHEMA).optional().default([]),
  motive: z
    .string()
    .trim()
    .min(10, "Motive explanation must be at least 10 characters")
    .max(3000, "Motive description must not exceed 3000 characters"),
  method: z
    .string()
    .trim()
    .min(10, "Method of operation must be at least 10 characters")
    .max(3000, "Method description must not exceed 3000 characters"),
  timelineSummary: z
    .string()
    .trim()
    .min(10, "Timeline account must be at least 10 characters")
    .max(3000, "Timeline account must not exceed 3000 characters"),
  explanation: z
    .string()
    .trim()
    .min(20, "Final deductive explanation must be at least 20 characters")
    .max(5000, "Deductive explanation must not exceed 5000 characters"),
  supportingEvidenceIds: z
    .array(UUID_SCHEMA)
    .min(1, "At least 1 supporting evidence item must be cited"),
  contradictingEvidenceIds: z.array(UUID_SCHEMA).optional().default([]),
  additionalFindings: z.string().max(2000).optional().default(""),
});

export type FinalSubmissionInput = z.infer<typeof FinalSubmissionSchema>;
