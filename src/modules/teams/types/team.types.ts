import {
  TeamRole,
  TeamStatus,
  MembershipStatus,
  InvitationStatus,
  InvestigationStatus,
  PlayMode,
} from "@prisma/client";

export interface TeamMemberDto {
  id: string;
  playerId: string;
  codename: string;
  displayName: string;
  avatarUrl: string | null;
  role: TeamRole;
  status: MembershipStatus;
  joinedAt: string;
  isLeader: boolean;
}

export interface TeamInvestigationDto {
  id: string;
  caseCode: string;
  caseTitle: string;
  status: InvestigationStatus;
  playMode: PlayMode;
  currentChapterOrder: number | null;
  currentChapterTitle: string | null;
  participantCount: number;
  startedAt: string;
}

export interface TeamSummaryDto {
  id: string;
  name: string;
  description: string | null;
  avatarUrl: string | null;
  teamCode: string;
  ownerCodename: string;
  ownerDisplayName: string;
  myRole: TeamRole | null;
  memberCount: number;
  activeInvestigationCount: number;
  createdAt: string;
}

export interface TeamDetailDto {
  id: string;
  name: string;
  description: string | null;
  avatarUrl: string | null;
  teamCode: string;
  status: TeamStatus;
  ownerId: string;
  ownerCodename: string;
  ownerDisplayName: string;
  myRole: TeamRole;
  members: TeamMemberDto[];
  activeInvestigations: TeamInvestigationDto[];
  pendingInvitationsCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface TeamInvitationDto {
  id: string;
  teamId: string;
  teamName: string;
  createdById: string;
  createdByCodename: string;
  invitedPlayerId: string | null;
  invitedPlayerCodename: string | null;
  status: InvitationStatus;
  expiresAt: string;
  createdAt: string;
  inviteLink?: string;
}

export interface InvitationPreviewDto {
  teamId: string;
  teamName: string;
  description: string | null;
  avatarUrl: string | null;
  leaderCodename: string;
  memberCount: number;
  expiresAt: string;
  status: InvitationStatus;
  isExpired: boolean;
}

export interface CreateTeamInput {
  name: string;
  description?: string;
  avatarUrl?: string;
}

export interface UpdateTeamInput {
  name?: string;
  description?: string;
  avatarUrl?: string;
}

export interface CreateInvitationInput {
  invitedPlayerId?: string;
  expiresInDays?: number;
}
