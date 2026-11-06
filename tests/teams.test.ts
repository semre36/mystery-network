import { describe, it, expect, vi, beforeEach } from "vitest";
import { TeamService } from "@/modules/teams/services/team.service";
import { InvitationService } from "@/modules/teams/services/invitation.service";
import { TeamGuard } from "@/modules/teams/guards/team.guard";
import { InvestigationService } from "@/modules/investigations/services/investigation.service";
import { EvidenceService } from "@/modules/evidence/services/evidence.service";
import {
  CreateTeamSchema,
  UpdateTeamSchema,
  CreateInvitationSchema,
  TransferLeadershipSchema,
  StartTeamInvestigationSchema,
} from "@/modules/teams/validation/team.schema";
import { GET as getTeamsRoute, POST as createTeamRoute } from "@/app/api/teams/route";
import { GET as getTeamByIdRoute, PATCH as updateTeamRoute } from "@/app/api/teams/[teamId]/route";
import { GET as getTeamMembersRoute } from "@/app/api/teams/[teamId]/members/route";
import { DELETE as leaveTeamRoute } from "@/app/api/teams/[teamId]/members/me/route";
import { DELETE as removeMemberRoute } from "@/app/api/teams/[teamId]/members/[userId]/route";
import { POST as transferLeadershipRoute } from "@/app/api/teams/[teamId]/transfer-leadership/route";
import {
  GET as getInvitationsRoute,
  POST as createInvitationRoute,
} from "@/app/api/teams/[teamId]/invitations/route";
import { DELETE as revokeInvitationRoute } from "@/app/api/teams/[teamId]/invitations/[invitationId]/route";
import { GET as getInvitationPreviewRoute } from "@/app/api/invitations/[token]/route";
import { POST as acceptInvitationRoute } from "@/app/api/invitations/[token]/accept/route";
import { POST as declineInvitationRoute } from "@/app/api/invitations/[token]/decline/route";
import { POST as joinTeamInvestigationRoute } from "@/app/api/investigations/[investigationId]/join/route";
import * as authGuard from "@/modules/authentication/guards/auth.guard";
import { prisma } from "@/server/infrastructure/database";
import { AppError } from "@/lib/errors/app-error";
import {
  TeamRole,
  TeamStatus,
  MembershipStatus,
  InvitationStatus,
  PlayMode,
  InvestigationStatus,
  ParticipantStatus,
  ChapterProgressStatus,
  ContentStatus,
  CaseDifficulty,
} from "@prisma/client";
import { NextRequest } from "next/server";

describe("Team Collaboration & Multiplayer Investigation (Phase 09)", () => {
  const MOCK_LEADER_USER_ID = "00000000-0000-4000-a000-000000000001";
  const MOCK_MEMBER_USER_ID = "00000000-0000-4000-a000-000000000002";
  const MOCK_OUTSIDER_USER_ID = "00000000-0000-4000-a000-000000000003";

  const MOCK_LEADER_PROFILE_ID = "00000000-0000-4000-a000-000000000011";
  const MOCK_MEMBER_PROFILE_ID = "00000000-0000-4000-a000-000000000012";
  const MOCK_OUTSIDER_PROFILE_ID = "00000000-0000-4000-a000-000000000013";

  const MOCK_TEAM_ID = "00000000-0000-4000-a000-000000000021";
  const MOCK_INVITATION_ID = "00000000-0000-4000-a000-000000000031";
  const MOCK_CASE_ID = "00000000-0000-4000-a000-000000000041";
  const MOCK_CHAPTER_ID = "00000000-0000-4000-a000-000000000051";
  const MOCK_INVESTIGATION_ID = "00000000-0000-4000-a000-000000000061";

  beforeEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  describe("Validation Schemas", () => {
    it("validates CreateTeamSchema correctly", () => {
      const valid = CreateTeamSchema.safeParse({
        name: "Shadow Syndicate",
        description: "Tactical cyber intelligence unit.",
      });
      expect(valid.success).toBe(true);

      const invalidTooShort = CreateTeamSchema.safeParse({ name: "ab" });
      expect(invalidTooShort.success).toBe(false);

      const invalidTooLong = CreateTeamSchema.safeParse({ name: "a".repeat(51) });
      expect(invalidTooLong.success).toBe(false);
    });

    it("validates CreateInvitationSchema correctly", () => {
      const valid = CreateInvitationSchema.safeParse({
        expiresInDays: 14,
      });
      expect(valid.success).toBe(true);
      if (valid.success) {
        expect(valid.data.expiresInDays).toBe(14);
      }

      const defaultDays = CreateInvitationSchema.safeParse({});
      expect(defaultDays.success).toBe(true);
      if (defaultDays.success) {
        expect(defaultDays.data.expiresInDays).toBe(7);
      }
    });

    it("validates TransferLeadershipSchema correctly", () => {
      const valid = TransferLeadershipSchema.safeParse({
        newLeaderPlayerId: MOCK_MEMBER_PROFILE_ID,
      });
      expect(valid.success).toBe(true);

      const invalid = TransferLeadershipSchema.safeParse({
        newLeaderPlayerId: "not-a-uuid",
      });
      expect(invalid.success).toBe(false);
    });
  });

  describe("Team Creation & Membership Lifecycle (TeamService)", () => {
    it("creates a squad atomically and assigns creator as Lead Investigator", async () => {
      vi.spyOn(prisma.playerProfile, "findUnique").mockResolvedValue({
        id: MOCK_LEADER_PROFILE_ID,
      } as any);

      vi.spyOn(prisma.team, "findUnique").mockResolvedValue(null); // No collision on teamCode

      const mockCreatedTeam = {
        id: MOCK_TEAM_ID,
        name: "Specter Taskforce",
        description: "Elite investigation squad",
        avatarUrl: null,
        inviteCode: "SQ-A1B2-C3D4",
        ownerId: MOCK_LEADER_PROFILE_ID,
        status: TeamStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.spyOn(prisma, "$transaction").mockImplementation(async (callback: any) => {
        const tx = {
          team: {
            create: vi.fn().mockResolvedValue(mockCreatedTeam),
          },
          teamMembership: {
            create: vi.fn().mockResolvedValue({
              id: "membership-1",
              teamId: MOCK_TEAM_ID,
              playerId: MOCK_LEADER_PROFILE_ID,
              role: TeamRole.LEAD_INVESTIGATOR,
              status: MembershipStatus.ACTIVE,
            }),
          },
        };
        return await callback(tx);
      });

      // Mock getTeamById for the return call
      vi.spyOn(TeamService, "getTeamById").mockResolvedValue({
        id: MOCK_TEAM_ID,
        name: "Specter Taskforce",
        description: "Elite investigation squad",
        avatarUrl: null,
        teamCode: "SQ-A1B2-C3D4",
        status: TeamStatus.ACTIVE,
        ownerId: MOCK_LEADER_PROFILE_ID,
        ownerCodename: "OPERATIVE-01",
        ownerDisplayName: "Agent Zero",
        myRole: TeamRole.LEAD_INVESTIGATOR,
        members: [],
        activeInvestigations: [],
        pendingInvitationsCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const squad = await TeamService.createTeam(MOCK_LEADER_USER_ID, {
        name: "Specter Taskforce",
        description: "Elite investigation squad",
      });

      expect(squad.id).toBe(MOCK_TEAM_ID);
      expect(squad.name).toBe("Specter Taskforce");
      expect(squad.myRole).toBe(TeamRole.LEAD_INVESTIGATOR);
    });

    it("prevents sole squad leader from leaving without transferring command", async () => {
      vi.spyOn(prisma.playerProfile, "findUnique").mockResolvedValue({
        id: MOCK_LEADER_PROFILE_ID,
      } as any);

      vi.spyOn(TeamGuard, "requireTeamMember").mockResolvedValue({
        team: { id: MOCK_TEAM_ID, ownerId: MOCK_LEADER_PROFILE_ID, status: TeamStatus.ACTIVE },
        membership: {
          id: "mem-1",
          role: TeamRole.LEAD_INVESTIGATOR,
          status: MembershipStatus.ACTIVE,
        },
        playerId: MOCK_LEADER_PROFILE_ID,
      });

      vi.spyOn(prisma, "$transaction").mockImplementation(async (callback: any) => {
        const tx = {
          teamMembership: {
            findMany: vi.fn().mockResolvedValue([
              { playerId: MOCK_LEADER_PROFILE_ID, role: TeamRole.LEAD_INVESTIGATOR },
              { playerId: MOCK_MEMBER_PROFILE_ID, role: TeamRole.DETECTIVE },
            ]),
            update: vi.fn(),
          },
          team: { update: vi.fn() },
        };
        return await callback(tx);
      });

      await expect(TeamService.leaveTeam(MOCK_LEADER_USER_ID, MOCK_TEAM_ID)).rejects.toThrow(
        "Squad leader must transfer leadership before leaving"
      );
    });

    it("auto-disbands squad when the last remaining operative leaves", async () => {
      vi.spyOn(prisma.playerProfile, "findUnique").mockResolvedValue({
        id: MOCK_LEADER_PROFILE_ID,
      } as any);

      vi.spyOn(TeamGuard, "requireTeamMember").mockResolvedValue({
        team: { id: MOCK_TEAM_ID, ownerId: MOCK_LEADER_PROFILE_ID, status: TeamStatus.ACTIVE },
        membership: {
          id: "mem-1",
          role: TeamRole.LEAD_INVESTIGATOR,
          status: MembershipStatus.ACTIVE,
        },
        playerId: MOCK_LEADER_PROFILE_ID,
      });

      const updateTeamSpy = vi.fn().mockResolvedValue({});
      vi.spyOn(prisma, "$transaction").mockImplementation(async (callback: any) => {
        const tx = {
          teamMembership: {
            findMany: vi
              .fn()
              .mockResolvedValue([
                { playerId: MOCK_LEADER_PROFILE_ID, role: TeamRole.LEAD_INVESTIGATOR },
              ]),
            update: vi.fn().mockResolvedValue({}),
          },
          team: {
            update: updateTeamSpy,
          },
        };
        return await callback(tx);
      });

      const result = await TeamService.leaveTeam(MOCK_LEADER_USER_ID, MOCK_TEAM_ID);
      expect(result.disbanded).toBe(true);
      expect(updateTeamSpy).toHaveBeenCalledWith({
        where: { id: MOCK_TEAM_ID },
        data: { status: TeamStatus.DISBANDED },
      });
    });

    it("allows Lead Investigator to remove a member from squad roster", async () => {
      vi.spyOn(prisma.playerProfile, "findUnique").mockResolvedValue({
        id: MOCK_LEADER_PROFILE_ID,
      } as any);

      vi.spyOn(TeamGuard, "requireTeamLeader").mockResolvedValue({
        team: { id: MOCK_TEAM_ID, ownerId: MOCK_LEADER_PROFILE_ID, status: TeamStatus.ACTIVE },
        membership: { id: "mem-1", role: TeamRole.LEAD_INVESTIGATOR },
        playerId: MOCK_LEADER_PROFILE_ID,
      });

      vi.spyOn(prisma.teamMembership, "findUnique").mockResolvedValue({
        id: "mem-2",
        teamId: MOCK_TEAM_ID,
        playerId: MOCK_MEMBER_PROFILE_ID,
        status: MembershipStatus.ACTIVE,
      } as any);

      const updateSpy = vi.spyOn(prisma.teamMembership, "update").mockResolvedValue({} as any);

      const result = await TeamService.removeTeamMember(
        MOCK_LEADER_USER_ID,
        MOCK_TEAM_ID,
        MOCK_MEMBER_PROFILE_ID
      );

      expect(result.message).toContain("removed from squad roster");
      expect(updateSpy).toHaveBeenCalledWith({
        where: { id: "mem-2" },
        data: { status: MembershipStatus.REMOVED },
      });
    });

    it("transfers leadership atomically and updates team ownership", async () => {
      vi.spyOn(prisma.playerProfile, "findUnique").mockResolvedValue({
        id: MOCK_LEADER_PROFILE_ID,
      } as any);

      vi.spyOn(TeamGuard, "requireTeamLeader").mockResolvedValue({
        team: { id: MOCK_TEAM_ID, ownerId: MOCK_LEADER_PROFILE_ID, status: TeamStatus.ACTIVE },
        membership: { id: "mem-1", role: TeamRole.LEAD_INVESTIGATOR },
        playerId: MOCK_LEADER_PROFILE_ID,
      });

      vi.spyOn(prisma.teamMembership, "findUnique").mockResolvedValue({
        id: "mem-2",
        teamId: MOCK_TEAM_ID,
        playerId: MOCK_MEMBER_PROFILE_ID,
        status: MembershipStatus.ACTIVE,
      } as any);

      const updateMembershipSpy = vi.fn().mockResolvedValue({});
      const updateTeamSpy = vi.fn().mockResolvedValue({});

      vi.spyOn(prisma, "$transaction").mockImplementation(async (callback: any) => {
        const tx = {
          teamMembership: { update: updateMembershipSpy },
          team: { update: updateTeamSpy },
        };
        return await callback(tx);
      });

      vi.spyOn(TeamService, "getTeamById").mockResolvedValue({
        id: MOCK_TEAM_ID,
        ownerId: MOCK_MEMBER_PROFILE_ID,
      } as any);

      await TeamService.transferTeamLeadership(
        MOCK_LEADER_USER_ID,
        MOCK_TEAM_ID,
        MOCK_MEMBER_PROFILE_ID
      );

      // Verify demotion of current leader
      expect(updateMembershipSpy).toHaveBeenCalledWith({
        where: { id: "mem-1" },
        data: { role: TeamRole.DETECTIVE },
      });

      // Verify promotion of target operative
      expect(updateMembershipSpy).toHaveBeenCalledWith({
        where: { id: "mem-2" },
        data: { role: TeamRole.LEAD_INVESTIGATOR },
      });

      // Verify team ownerId update
      expect(updateTeamSpy).toHaveBeenCalledWith({
        where: { id: MOCK_TEAM_ID },
        data: { ownerId: MOCK_MEMBER_PROFILE_ID },
      });
    });
  });

  describe("Cryptographic Invitation Tokens & Security (InvitationService)", () => {
    it("generates 256-bit token entropy and stores SHA-256 hash in DB", async () => {
      vi.spyOn(prisma.playerProfile, "findUnique").mockResolvedValue({
        id: MOCK_LEADER_PROFILE_ID,
      } as any);

      vi.spyOn(TeamGuard, "requireTeamLeader").mockResolvedValue({
        team: { id: MOCK_TEAM_ID, name: "Night Stalkers", status: TeamStatus.ACTIVE },
        membership: { id: "mem-1", role: TeamRole.LEAD_INVESTIGATOR },
        playerId: MOCK_LEADER_PROFILE_ID,
      });

      const createInvitationSpy = vi.spyOn(prisma.teamInvitation, "create").mockResolvedValue({
        id: MOCK_INVITATION_ID,
        teamId: MOCK_TEAM_ID,
        invitationCode: "hashed_token_string",
        createdById: MOCK_LEADER_PROFILE_ID,
        invitedPlayerId: null,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        status: InvitationStatus.PENDING,
        createdAt: new Date(),
        createdBy: { codename: "ALPHA-LEADER" },
        invitedPlayer: null,
      } as any);

      const result = await InvitationService.createInvitation(MOCK_LEADER_USER_ID, MOCK_TEAM_ID, {
        expiresInDays: 7,
      });

      expect(result.rawToken).toBeDefined();
      expect(result.rawToken.length).toBe(64); // 32 bytes hex = 64 characters (256 bits)
      expect(result.invitation.inviteLink).toBe(`/invitations/${result.rawToken}`);

      // Confirm DB call received a SHA-256 hashed version
      const expectedHash = InvitationService.hashToken(result.rawToken);
      expect(createInvitationSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            invitationCode: expectedHash,
            status: InvitationStatus.PENDING,
          }),
        })
      );
    });

    it("safely previews invitation without leaking tokens or private data", async () => {
      const mockRawToken = "abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890";
      const expectedHash = InvitationService.hashToken(mockRawToken);

      vi.spyOn(prisma.teamInvitation, "findUnique").mockResolvedValue({
        id: MOCK_INVITATION_ID,
        teamId: MOCK_TEAM_ID,
        invitationCode: expectedHash,
        expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        status: InvitationStatus.PENDING,
        team: {
          id: MOCK_TEAM_ID,
          name: "Vanguard Unit",
          description: "Classified directive unit",
          avatarUrl: null,
          status: TeamStatus.ACTIVE,
          owner: { codename: "COMMANDER-01" },
          _count: { members: 3 },
        },
      } as any);

      const preview = await InvitationService.getInvitationPreview(mockRawToken);

      expect(preview.teamName).toBe("Vanguard Unit");
      expect(preview.leaderCodename).toBe("COMMANDER-01");
      expect(preview.memberCount).toBe(3);
      expect(preview.isExpired).toBe(false);
      // Ensure no raw token or hash is leaked in preview DTO
      expect((preview as any).invitationCode).toBeUndefined();
      expect((preview as any).rawToken).toBeUndefined();
    });

    it("accepts invitation in transaction, enrolls operative, and prevents reuse", async () => {
      const mockRawToken = "fedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321";
      const expectedHash = InvitationService.hashToken(mockRawToken);

      vi.spyOn(prisma.playerProfile, "findUnique").mockResolvedValue({
        id: MOCK_MEMBER_PROFILE_ID,
      } as any);

      const updateInvitationSpy = vi.fn().mockResolvedValue({});
      const createMembershipSpy = vi.fn().mockResolvedValue({});

      vi.spyOn(prisma, "$transaction").mockImplementation(async (callback: any) => {
        const tx = {
          teamInvitation: {
            findUnique: vi.fn().mockResolvedValue({
              id: MOCK_INVITATION_ID,
              teamId: MOCK_TEAM_ID,
              invitationCode: expectedHash,
              status: InvitationStatus.PENDING,
              expiresAt: new Date(Date.now() + 86400000),
              invitedPlayerId: null,
              team: { id: MOCK_TEAM_ID, name: "Vanguard Unit", status: TeamStatus.ACTIVE },
            }),
            update: updateInvitationSpy,
          },
          teamMembership: {
            findUnique: vi.fn().mockResolvedValue(null), // Not yet a member
            create: createMembershipSpy,
          },
        };
        return await callback(tx);
      });

      const result = await InvitationService.acceptInvitation(MOCK_MEMBER_USER_ID, mockRawToken);

      expect(result.teamId).toBe(MOCK_TEAM_ID);
      expect(createMembershipSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            teamId: MOCK_TEAM_ID,
            playerId: MOCK_MEMBER_PROFILE_ID,
            role: TeamRole.DETECTIVE,
            status: MembershipStatus.ACTIVE,
          }),
        })
      );
      expect(updateInvitationSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: MOCK_INVITATION_ID },
          data: expect.objectContaining({
            status: InvitationStatus.ACCEPTED,
          }),
        })
      );
    });

    it("rejects acceptance of already accepted or revoked invitations", async () => {
      const mockRawToken = "usedtoken1234567890usedtoken1234567890usedtoken1234567890usedtoken1";

      vi.spyOn(prisma.playerProfile, "findUnique").mockResolvedValue({
        id: MOCK_MEMBER_PROFILE_ID,
      } as any);

      vi.spyOn(prisma, "$transaction").mockImplementation(async (callback: any) => {
        const tx = {
          teamInvitation: {
            findUnique: vi.fn().mockResolvedValue({
              id: MOCK_INVITATION_ID,
              teamId: MOCK_TEAM_ID,
              status: InvitationStatus.ACCEPTED, // Already used
              expiresAt: new Date(Date.now() + 86400000),
              team: { status: TeamStatus.ACTIVE },
            }),
          },
        };
        return await callback(tx);
      });

      await expect(
        InvitationService.acceptInvitation(MOCK_MEMBER_USER_ID, mockRawToken)
      ).rejects.toThrow("This invitation has already been accepted and cannot be reused");
    });
  });

  describe("Multiplayer Investigation Coordination & Clue Synchronization", () => {
    it("starts a cooperative squad investigation with teamId and all squad members", async () => {
      vi.spyOn(prisma.playerProfile, "findUnique").mockResolvedValue({
        id: MOCK_LEADER_PROFILE_ID,
      } as any);

      vi.spyOn(TeamGuard, "requireTeamLeader").mockResolvedValue({
        team: { id: MOCK_TEAM_ID, name: "Ghost Operatives", status: TeamStatus.ACTIVE },
        membership: { id: "mem-1", role: TeamRole.LEAD_INVESTIGATOR },
        playerId: MOCK_LEADER_PROFILE_ID,
      });

      vi.spyOn(prisma.case, "findFirst").mockResolvedValue({
        id: MOCK_CASE_ID,
        caseCode: "CASE-001-MIDNIGHT-PROTOCOL",
        status: ContentStatus.PUBLISHED,
        chapters: [{ id: MOCK_CHAPTER_ID, chapterOrder: 1, status: ContentStatus.PUBLISHED }],
      } as any);

      vi.spyOn(prisma.teamMembership, "findMany").mockResolvedValue([
        { playerId: MOCK_LEADER_PROFILE_ID },
        { playerId: MOCK_MEMBER_PROFILE_ID },
      ] as any);

      const createInvestigationSpy = vi.fn().mockResolvedValue({
        id: MOCK_INVESTIGATION_ID,
        caseId: MOCK_CASE_ID,
        teamId: MOCK_TEAM_ID,
        status: InvestigationStatus.IN_PROGRESS,
        playMode: PlayMode.COOPERATIVE,
      });

      const createParticipantsSpy = vi.fn().mockResolvedValue({ count: 2 });
      const provisionCluesSpy = vi
        .spyOn(EvidenceService, "provisionInvestigationClues")
        .mockResolvedValue(3);

      vi.spyOn(prisma, "$transaction").mockImplementation(async (callback: any) => {
        const tx = {
          $executeRaw: vi.fn().mockResolvedValue(1),
          investigation: {
            findFirst: vi.fn().mockResolvedValue(null), // No existing active session
            create: createInvestigationSpy,
          },
          investigationParticipant: {
            createMany: createParticipantsSpy,
          },
          investigationProgress: {
            createMany: vi.fn().mockResolvedValue({ count: 1 }),
          },
          clue: {
            findMany: vi.fn().mockResolvedValue([]),
          },
        };
        return await callback(tx);
      });

      const result = await InvestigationService.startInvestigation(
        MOCK_LEADER_USER_ID,
        "CASE-001-MIDNIGHT-PROTOCOL",
        { teamId: MOCK_TEAM_ID }
      );

      expect(result.investigationId).toBe(MOCK_INVESTIGATION_ID);
      expect(result.wasResumed).toBe(false);

      expect(createInvestigationSpy).toHaveBeenCalledWith({
        data: expect.objectContaining({
          teamId: MOCK_TEAM_ID,
          playMode: PlayMode.COOPERATIVE,
          status: InvestigationStatus.IN_PROGRESS,
        }),
      });

      expect(createParticipantsSpy).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({ playerId: MOCK_LEADER_PROFILE_ID }),
          expect.objectContaining({ playerId: MOCK_MEMBER_PROFILE_ID }),
        ]),
      });

      expect(provisionCluesSpy).toHaveBeenCalled();
    });

    it("allows a team member to join an active squad investigation and provisions clues", async () => {
      vi.spyOn(prisma.playerProfile, "findUnique").mockResolvedValue({
        id: MOCK_MEMBER_PROFILE_ID,
      } as any);

      vi.spyOn(prisma.investigation, "findUnique").mockResolvedValue({
        id: MOCK_INVESTIGATION_ID,
        caseId: MOCK_CASE_ID,
        teamId: MOCK_TEAM_ID,
        playMode: PlayMode.COOPERATIVE,
        status: InvestigationStatus.IN_PROGRESS,
        participants: [{ playerId: MOCK_LEADER_PROFILE_ID, status: ParticipantStatus.ACTIVE }],
        progress: [
          {
            chapterId: MOCK_CHAPTER_ID,
            status: ChapterProgressStatus.IN_PROGRESS,
            chapter: { chapterOrder: 1 },
          },
        ],
      } as any);

      // Caller is an active member of this squad
      vi.spyOn(prisma.teamMembership, "findUnique").mockResolvedValue({
        id: "mem-2",
        teamId: MOCK_TEAM_ID,
        playerId: MOCK_MEMBER_PROFILE_ID,
        status: MembershipStatus.ACTIVE,
      } as any);

      const provisionCluesSpy = vi
        .spyOn(EvidenceService, "provisionInvestigationClues")
        .mockResolvedValue(2);

      vi.spyOn(prisma, "$transaction").mockImplementation(async (callback: any) => {
        const tx = {
          investigationParticipant: {
            findUnique: vi.fn().mockResolvedValue(null),
            create: vi.fn().mockResolvedValue({}),
          },
          clue: { findMany: vi.fn().mockResolvedValue([]) },
        };
        return await callback(tx);
      });

      // Mock getInvestigationWorkspace
      vi.spyOn(InvestigationService, "getInvestigationWorkspace").mockResolvedValue({
        id: MOCK_INVESTIGATION_ID,
        status: InvestigationStatus.IN_PROGRESS,
        playMode: PlayMode.COOPERATIVE,
      } as any);

      const workspace = await InvestigationService.joinTeamInvestigation(
        MOCK_MEMBER_USER_ID,
        MOCK_INVESTIGATION_ID
      );

      expect(workspace.id).toBe(MOCK_INVESTIGATION_ID);
      expect(provisionCluesSpy).toHaveBeenCalledWith(
        expect.anything(),
        MOCK_INVESTIGATION_ID,
        MOCK_CASE_ID,
        MOCK_CHAPTER_ID,
        [MOCK_MEMBER_PROFILE_ID]
      );
    });

    it("blocks non-team members from joining or accessing a squad investigation", async () => {
      vi.spyOn(prisma.playerProfile, "findUnique").mockResolvedValue({
        id: MOCK_OUTSIDER_PROFILE_ID,
      } as any);

      vi.spyOn(prisma.investigation, "findUnique").mockResolvedValue({
        id: MOCK_INVESTIGATION_ID,
        caseId: MOCK_CASE_ID,
        teamId: MOCK_TEAM_ID,
        playMode: PlayMode.COOPERATIVE,
        status: InvestigationStatus.IN_PROGRESS,
        participants: [],
      } as any);

      // Outsider is not a member of the squad
      vi.spyOn(prisma.teamMembership, "findUnique").mockResolvedValue(null);

      await expect(
        InvestigationService.joinTeamInvestigation(MOCK_OUTSIDER_USER_ID, MOCK_INVESTIGATION_ID)
      ).rejects.toThrow("You are not an active operative of the squad");
    });
  });

  describe("API Route Handlers (HTTP Integration)", () => {
    it("POST /api/teams creates a squad when authenticated", async () => {
      vi.spyOn(authGuard, "requireAuthenticatedUser").mockResolvedValue({
        id: MOCK_LEADER_USER_ID,
      } as any);

      vi.spyOn(TeamService, "createTeam").mockResolvedValue({
        id: MOCK_TEAM_ID,
        name: "Shadow Unit",
        teamCode: "SQ-9999-1111",
      } as any);

      const req = new NextRequest("http://localhost:3000/api/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Shadow Unit" }),
      });

      const res = await createTeamRoute(req);
      const json = await res.json();

      expect(res.status).toBe(201);
      expect(json.ok).toBe(true);
      expect(json.data.id).toBe(MOCK_TEAM_ID);
    });

    it("GET /api/invitations/[token] returns preview without authentication", async () => {
      vi.spyOn(InvitationService, "getInvitationPreview").mockResolvedValue({
        teamId: MOCK_TEAM_ID,
        teamName: "Phantom Squad",
        description: null,
        avatarUrl: null,
        leaderCodename: "LEADER-1",
        memberCount: 4,
        expiresAt: new Date().toISOString(),
        status: InvitationStatus.PENDING,
        isExpired: false,
      });

      const req = new NextRequest("http://localhost:3000/api/invitations/sample-token");
      const res = await getInvitationPreviewRoute(req, {
        params: Promise.resolve({ token: "sample-token" }),
      });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.ok).toBe(true);
      expect(json.data.teamName).toBe("Phantom Squad");
    });

    it("POST /api/investigations/[investigationId]/join joins squad operation", async () => {
      vi.spyOn(authGuard, "requireAuthenticatedUser").mockResolvedValue({
        id: MOCK_MEMBER_USER_ID,
      } as any);

      vi.spyOn(InvestigationService, "joinTeamInvestigation").mockResolvedValue({
        id: MOCK_INVESTIGATION_ID,
        status: InvestigationStatus.IN_PROGRESS,
        playMode: PlayMode.COOPERATIVE,
      } as any);

      const req = new NextRequest(
        `http://localhost:3000/api/investigations/${MOCK_INVESTIGATION_ID}/join`,
        {
          method: "POST",
        }
      );

      const res = await joinTeamInvestigationRoute(req, {
        params: Promise.resolve({ investigationId: MOCK_INVESTIGATION_ID }),
      });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.ok).toBe(true);
      expect(json.data.id).toBe(MOCK_INVESTIGATION_ID);
    });
  });
});
