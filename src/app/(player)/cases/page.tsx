import { FolderSearch } from "lucide-react";
import { ComingSoonPanel } from "@/components/shared/coming-soon-panel";

export const metadata = {
  title: "Case Operations | MYSTERY NETWORK",
};

export default function CasesPage() {
  return (
    <ComingSoonPanel
      moduleName="Case Operations & Mystery Catalog"
      moduleCode="MOD-06"
      targetPhase="Phase 06"
      scheduledPhaseName="Phase 06: Case Management"
      description="The Case Operations engine coordinates published investigative mysteries, multi-act campaign narratives, difficulty classifications, and seasonal crime dossiers."
      icon={FolderSearch}
      deliverables={[
        "Published mystery case catalog & act selection",
        "Difficulty tiers (Novice, Detective, Master Sleuth)",
        "Immutable case briefing documents & crime scene overview",
        "Solo and squad operation dispatch engine",
      ]}
    />
  );
}
