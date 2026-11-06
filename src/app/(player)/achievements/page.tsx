import { Award } from "lucide-react";
import { ComingSoonPanel } from "@/components/shared/coming-soon-panel";

export const metadata = {
  title: "Commendation Registry | MYSTERY NETWORK",
};

export default function AchievementsPage() {
  return (
    <ComingSoonPanel
      moduleName="Commendation Registry & Badges"
      moduleCode="MOD-12"
      targetPhase="Phase 12"
      scheduledPhaseName="Phase 12: Submissions & Rewards"
      description="The Commendation Registry showcases network-wide detective achievements, milestone ribbons, puzzle solving honors, and seasonal investigator leaderboards."
      icon={Award}
      deliverables={[
        "Full achievement catalog with tiered ribbon badges",
        "Milestone progress indicators (Puzzles Solved, Cases Closed)",
        "Global and seasonal detective ranking leaderboards",
        "Cryptographically verified proof of mystery completion",
      ]}
    />
  );
}
