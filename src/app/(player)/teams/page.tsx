import { Users2 } from "lucide-react";
import { ComingSoonPanel } from "@/components/shared/coming-soon-panel";

export const metadata = {
  title: "Squads & Units | MYSTERY NETWORK",
};

export default function TeamsPage() {
  return (
    <ComingSoonPanel
      moduleName="Squad Formation & Unit Operations"
      moduleCode="MOD-09"
      targetPhase="Phase 09"
      scheduledPhaseName="Phase 09: Team Collaboration"
      description="Form operative units, generate secure squad invite codes, coordinate joint investigations, and analyze asymmetric evidence collaboratively."
      icon={Users2}
      deliverables={[
        "Squad creation & unique team callsigns",
        "Deep-link squad invite generation (e.g. invite_CODE)",
        "Squad role assignment (Lead Investigator, Cryptographer, Forensic Analyst)",
        "Team investigation coordination & synchronized timelines",
      ]}
    />
  );
}
