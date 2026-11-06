import { z } from "zod";
import { CaseDifficulty } from "@prisma/client";

export const CaseQuerySchema = z.object({
  search: z.string().trim().max(100).optional(),
  difficulty: z.nativeEnum(CaseDifficulty).optional(),
  campaignSlug: z.string().trim().max(100).optional(),
  sortBy: z.enum(["newest", "oldest", "title", "difficulty"]).default("newest"),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
});

export type CaseQueryInput = z.infer<typeof CaseQuerySchema>;
