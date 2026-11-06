import React from "react";
import { notFound, redirect } from "next/navigation";
import { requireAuthenticatedUser } from "@/modules/authentication/guards/auth.guard";
import { SubmissionService } from "@/modules/submissions/services/submission.service";
import { ResultsView } from "@/components/submissions/results-view";
import { AppError } from "@/lib/errors/app-error";

export const dynamic = "force-dynamic";

interface ResultsPageProps {
  params: Promise<{ investigationId: string }>;
}

export const metadata = {
  title: "Investigation Results & Judgment | MYSTERY NETWORK",
};

export default async function ResultsPage({ params }: ResultsPageProps) {
  const user = await requireAuthenticatedUser();
  const { investigationId } = await params;

  let results;
  try {
    results = await SubmissionService.getInvestigationResults(investigationId, user.id);
  } catch (err: any) {
    if (err instanceof AppError && err.code === "RESULTS_NOT_FOUND") {
      redirect(`/investigations/${investigationId}/submission`);
    }
    if (err instanceof AppError && err.code === "INVESTIGATION_NOT_FOUND") {
      notFound();
    }
    redirect(`/investigations/${investigationId}`);
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <ResultsView results={results} />
    </div>
  );
}
