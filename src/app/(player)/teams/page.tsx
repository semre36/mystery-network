import React from "react";
import { getCurrentUser } from "@/modules/authentication/guards/auth.guard";
import { TeamService } from "@/modules/teams/services/team.service";
import { TeamsDashboardClient } from "@/components/teams/teams-dashboard-client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Squad Operations & Units | MYSTERY NETWORK",
  description: "Manage your investigative squads, rosters, and collaborative field operations.",
};

export default async function TeamsPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const squads = await TeamService.getMyTeams(user.id);

  return <TeamsDashboardClient initialSquads={squads} />;
}
