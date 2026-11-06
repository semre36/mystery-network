import { z } from "zod";
import { InvestigationStatus } from "@prisma/client";

export const StartInvestigationSchema = z.object({
  caseIdentifier: z
    .string()
    .trim()
    .min(1, "Case identifier is required")
    .max(100, "Case identifier too long"),
});

export const InvestigationTransitionSchema = z.object({
  action: z.enum(["PAUSE", "RESUME", "ABANDON", "COMPLETE", "FAIL"], {
    message: "Invalid lifecycle transition action. Allowed: PAUSE, RESUME, ABANDON, COMPLETE, FAIL",
  }),
});

export const UpdateChapterProgressSchema = z.object({
  chapterId: z.string().uuid("Valid chapter UUID required"),
  action: z.enum(["START_CHAPTER", "COMPLETE_CHAPTER"], {
    message: "Valid progress action required (START_CHAPTER or COMPLETE_CHAPTER)",
  }),
});

export const InvestigationQuerySchema = z.object({
  status: z.nativeEnum(InvestigationStatus).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

export type StartInvestigationInput = z.infer<typeof StartInvestigationSchema>;
export type InvestigationTransitionInput = z.infer<typeof InvestigationTransitionSchema>;
export type UpdateChapterProgressInput = z.infer<typeof UpdateChapterProgressSchema>;
export type InvestigationQueryInput = z.infer<typeof InvestigationQuerySchema>;
