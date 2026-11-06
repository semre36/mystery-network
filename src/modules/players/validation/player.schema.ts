import { z } from "zod";
import { AVAILABLE_SPECIALIZATIONS } from "../utils/rank.util";

export const updateProfileSchema = z
  .object({
    codename: z
      .string()
      .trim()
      .min(3, "Codename must be at least 3 characters")
      .max(30, "Codename cannot exceed 30 characters")
      .regex(/^[a-zA-Z0-9_]+$/, "Codename can only contain letters, numbers, and underscores")
      .transform((val) => val.toUpperCase())
      .optional(),
    displayName: z
      .string()
      .trim()
      .min(1, "Display name cannot be empty")
      .max(50, "Display name cannot exceed 50 characters")
      .optional(),
    specialization: z.enum(AVAILABLE_SPECIALIZATIONS).optional(),
    theme: z.enum(["navy", "noir"]).optional(),
    languageCode: z
      .string()
      .trim()
      .min(2, "Language code must be at least 2 characters")
      .max(10, "Language code cannot exceed 10 characters")
      .optional(),
  })
  .strict(); // Rejects any extra keys such as xp, level, rank, role, status
