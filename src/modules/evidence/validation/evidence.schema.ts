import { z } from "zod";
import { ClueType } from "@prisma/client";

export const EvidenceQuerySchema = z.object({
  type: z.nativeEnum(ClueType).optional(),
  chapterId: z.string().uuid("Invalid chapter UUID format").optional(),
  search: z.string().trim().max(100, "Search query too long").optional(),
  scope: z.enum(["ALL", "MINE", "SHARED", "INVESTIGATION_WIDE"]).default("ALL"),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const SaveEvidenceNoteSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, "Note content cannot be empty")
    .max(2000, "Note content cannot exceed 2000 characters"),
});

export const ShareEvidenceSchema = z.object({
  recipientPlayerId: z.string().uuid("Valid recipient operative ID required").optional(),
});

export type EvidenceQueryInput = z.infer<typeof EvidenceQuerySchema>;
export type SaveEvidenceNoteInput = z.infer<typeof SaveEvidenceNoteSchema>;
export type ShareEvidenceInput = z.infer<typeof ShareEvidenceSchema>;
