import React from "react";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/modules/authentication/guards/auth.guard";
import { TeamService } from "@/modules/teams/services/team.service";
import { TeamGuard } from "@/modules/teams/guards/team.guard";
import { TeamDetailClient } from "@/components/teams/team-detail-client";

export const dynamic = "force-dynamic";

interface TeamDetailPageProps {
  params: Promise<{
    teamId: string;
  }>;
}

export async function generateMetadata({ params }: TeamDetailPageProps) {
  const { teamId } = await params;
  return {
    title: `Squad Dossier | MYSTERY NETWORK`,
  };
}

export default async function TeamDetailPage({ params }: TeamDetailPageProps) {
  const user = await getCurrentUser();
  if (!user) return null;

  const { teamId } = await params;

  let team;
  let currentPlayerId;
  try {
    [team, currentPlayerId] = await Promise.all([
      TeamService.getTeamById(user.id, teamId),
      TeamGuard.getPlayerProfileId(user.id),
    ]);
  } catch {
    notFound();
  }

  return <TeamDetailClient team={team} currentPlayerId={currentPlayerId} />;
}
