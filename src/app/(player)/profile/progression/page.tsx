import React from "react";
import { requireAuthenticatedUser } from "@/modules/authentication/guards/auth.guard";
import { ProgressionService } from "@/modules/progression/services/progression.service";
import { ProgressionView } from "@/components/progression/progression-view";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Investigator Progression & Ledger | MYSTERY NETWORK",
};

export default async function ProgressionPage() {
  const user = await requireAuthenticatedUser();
  const progression = await ProgressionService.getPlayerProgression(user.id);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <ProgressionView progression={progression} />
    </div>
  );
}

