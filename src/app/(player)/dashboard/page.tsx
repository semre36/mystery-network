import { redirect } from "next/navigation";
import { getCurrentUser } from "@/modules/authentication/guards/auth.guard";
import { PlayerService } from "@/modules/players/services/player.service";
import { WelcomeHeader } from "@/components/player/welcome-header";
import { InvestigatorDossierCard } from "@/components/player/investigator-dossier-card";
import { ProgressionPanel } from "@/components/player/progression-panel";
import { InvestigationOverview } from "@/components/player/investigation-overview";
import { AchievementsPanel } from "@/components/player/achievements-panel";
import { RecentActivityPanel } from "@/components/player/recent-activity-panel";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Command Dashboard | MYSTERY NETWORK",
  description: "Investigator Command Center & Field Dossier",
};

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/");
  }

  const dashboardData = await PlayerService.getDashboardData(user.id);
  const { dossier, stats, achievements, recentActivity } = dashboardData;

  return (
    <div className="space-y-6">
      {/* 1. Welcome & Identity Header */}
      <WelcomeHeader dossier={dossier} />

      {/* 2. Main Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Dossier Card & Progression */}
        <div className="lg:col-span-5 space-y-6">
          <InvestigatorDossierCard dossier={dossier} />
          <ProgressionPanel dossier={dossier} stats={stats} />
        </div>

        {/* Right Column: Active Operations, Achievements & Logs */}
        <div className="lg:col-span-7 space-y-6">
          <InvestigationOverview stats={stats} />
          <AchievementsPanel achievements={achievements} />
          <RecentActivityPanel activity={recentActivity} />
        </div>
      </div>
    </div>
  );
}
