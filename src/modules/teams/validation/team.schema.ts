import { z } from "zod";

export const CreateTeamSchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, "Team callsign must be at least 3 characters")
    .max(50, "Team callsign cannot exceed 50 characters"),
  description: z.string().trim().max(500, "Description cannot exceed 500 characters").optional(),
  avatarUrl: z.string().trim().url("Avatar must be a valid URL").optional().or(z.literal("")),
});

export const UpdateTeamSchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, "Team callsign must be at least 3 characters")
    .max(50, "Team callsign cannot exceed 50 characters")
    .optional(),
  description: z.string().trim().max(500, "Description cannot exceed 500 characters").optional(),
  avatarUrl: z.string().trim().url("Avatar must be a valid URL").optional().or(z.literal("")),
});

export const CreateInvitationSchema = z.object({
  invitedPlayerId: z.string().uuid("Invalid operative ID format").optional(),
  expiresInDays: z.coerce.number().int().min(1).max(30).default(7),
});

export const TransferLeadershipSchema = z.object({
  newLeaderPlayerId: z.string().uuid("Valid operative ID required for leadership transfer"),
});

export const StartTeamInvestigationSchema = z.object({
  caseIdentifier: z.string().trim().min(1, "Case identifier is required"),
  participantPlayerIds: z.array(z.string().uuid("Invalid operative UUID")).optional(),
});

export type CreateTeamSchemaInput = z.infer<typeof CreateTeamSchema>;
export type UpdateTeamSchemaInput = z.infer<typeof UpdateTeamSchema>;
export type CreateInvitationSchemaInput = z.infer<typeof CreateInvitationSchema>;
export type TransferLeadershipSchemaInput = z.infer<typeof TransferLeadershipSchema>;
export type StartTeamInvestigationSchemaInput = z.infer<typeof StartTeamInvestigationSchema>;
