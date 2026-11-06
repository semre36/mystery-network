import { Network } from "lucide-react";
import { ComingSoonPanel } from "@/components/shared/coming-soon-panel";

export const metadata = {
  title: "Investigation Board | MYSTERY NETWORK",
};

export default function BoardPage() {
  return (
    <ComingSoonPanel
      moduleName="Collaborative Investigation Board"
      moduleCode="MOD-11"
      targetPhase="Phase 11"
      scheduledPhaseName="Phase 11: Investigation Board"
      description="The interactive investigation canvas allows detectives to visually connect suspects, evidence pins, timeline intervals, and motives into a coherent theory."
      icon={Network}
      deliverables={[
        "Interactive canvas for pins, photos & string connections",
        "Suspect timeline reconstruction & alibi mapping",
        "Shared squad board with real-time node positioning",
        "Hypothesis tagging & deduction linking",
      ]}
    />
  );
}
