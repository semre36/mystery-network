import { FileKey } from "lucide-react";
import { ComingSoonPanel } from "@/components/shared/coming-soon-panel";

export const metadata = {
  title: "Evidence Locker | MYSTERY NETWORK",
};

export default function EvidencePage() {
  return (
    <ComingSoonPanel
      moduleName="Evidence Locker & Forensic Clues"
      moduleCode="MOD-08"
      targetPhase="Phase 08"
      scheduledPhaseName="Phase 08: Evidence System"
      description="The Evidence Locker manages asymmetric clue distribution, chain-of-custody tracking, forensic asset inspection, and secure player-to-player evidence sharing."
      icon={FileKey}
      deliverables={[
        "Asymmetric clue assignment per operative",
        "High-resolution document & audio log viewer",
        "Forensic item inspection & metadata decoding",
        "IDOR-protected evidence transfer protocol",
      ]}
    />
  );
}
