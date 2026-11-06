import React from "react";
import { requireAuthenticatedUser } from "@/modules/authentication/guards/auth.guard";
import { ProgressionService } from "@/modules/progression/services/progression.service";
import { AchievementsView } from "@/components/progression/achievements-view";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Commendation Registry & Badges | MYSTERY NETWORK",
};

export default async function AchievementsPage() {
  const user = await requireAuthenticatedUser();
  const achievements = await ProgressionService.getPlayerAchievements(user.id);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <AchievementsView achievements={achievements} />
    </div>
  );
}
