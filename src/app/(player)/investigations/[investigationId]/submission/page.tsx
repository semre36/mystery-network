import React from "react";
import { notFound, redirect } from "next/navigation";
import { requireAuthenticatedUser } from "@/modules/authentication/guards/auth.guard";
import { SubmissionGuard } from "@/modules/submissions/guards/submission.guard";
import { SubmissionService } from "@/modules/submissions/services/submission.service";
import { SubmissionForm } from "@/components/submissions/submission-form";
import { PlayMode, SubmissionStatus, TeamRole } from "@prisma/client";
import { prisma } from "@/server/infrastructure/database";

export const dynamic = "force-dynamic";

interface SubmissionPageProps {
  params: Promise<{ investigationId: string }>;
}

export const metadata = {
  title: "Case Indictment & Final Judgment | MYSTERY NETWORK",
};

export default async function SubmissionPage({ params }: SubmissionPageProps) {
  const user = await requireAuthenticatedUser();
  const { investigationId } = await params;

  let access;
  try {
    access = await SubmissionGuard.verifySubmissionAccess(investigationId, user.id);
  } catch (err: any) {
    if (err.code === "INVESTIGATION_NOT_FOUND") notFound();
    redirect(`/investigations/${investigationId}`);
  }

  const { investigation, playerId, memberRole } = access;

  // If already evaluated, redirect straight to results
  const existingSubmission = await SubmissionService.getSubmission(investigationId, user.id);
  if (existingSubmission && existingSubmission.status === SubmissionStatus.EVALUATED) {
    redirect(`/investigations/${investigationId}/results`);
  }

  // Load characters registered in this case
  const characters = await prisma.caseCharacter.findMany({
    where: { caseId: investigation.caseId },
    select: {
      id: true,
      name: true,
      description: true,
      metadata: true,
    },
  });

  const formattedCharacters = characters.map((c) => ({
    id: c.id,
    name: c.name,
    description: c.description,
    role: (c.metadata as any)?.role,
  }));

  // Load declassified/accessible clues for this investigation
  const assignments = await prisma.clueAssignment.findMany({
    where: {
      investigationId,
      ...(investigation.playMode === PlayMode.SOLO ? { playerId } : {}),
    },
    include: {
      clue: {
        select: {
          id: true,
          clueCode: true,
          title: true,
          description: true,
          clueType: true,
        },
      },
    },
  });

  const accessibleClues = assignments.map((a) => ({
    id: a.clue.id,
    clueCode: a.clue.clueCode,
    title: a.clue.title,
    descriptionSnippet: a.clue.description?.slice(0, 80),
    clueType: a.clue.clueType,
  }));

  const canSubmit =
    investigation.playMode === PlayMode.SOLO || memberRole === TeamRole.LEAD_INVESTIGATOR;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <SubmissionForm
        investigationId={investigationId}
        initialSubmission={existingSubmission}
        caseCode={investigation.case.caseCode}
        caseTitle={investigation.case.title}
        characters={formattedCharacters}
        availableEvidence={accessibleClues}
        isCooperative={investigation.playMode === PlayMode.COOPERATIVE}
        canSubmit={canSubmit}
      />
    </div>
  );
}

