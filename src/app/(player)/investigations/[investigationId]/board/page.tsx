import { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { requireAuthenticatedUser } from "@/modules/authentication/guards/auth.guard";
import { InvestigationBoardService } from "@/modules/investigation-board/services/investigation-board.service";
import { InvestigationService } from "@/modules/investigations/services/investigation.service";
import { InvestigationBoardCanvas } from "@/components/board/investigation-board-canvas";
import { AppError } from "@/lib/errors/app-error";

export const dynamic = "force-dynamic";

interface BoardPageProps {
  params: Promise<{
    investigationId: string;
  }>;
}

export async function generateMetadata({ params }: BoardPageProps): Promise<Metadata> {
  const { investigationId } = await params;
  return {
    title: `Investigation Board | Session #${investigationId.slice(0, 8)}`,
    description:
      "Visual detective corkboard, timeline reconstruction, and case deduction theories.",
  };
}

export default async function InvestigationBoardPage({ params }: BoardPageProps) {
  let user;
  try {
    user = await requireAuthenticatedUser();
  } catch {
    redirect("/");
  }

  const { investigationId } = await params;

  let board;
  let workspace;
  try {
    [board, workspace] = await Promise.all([
      InvestigationBoardService.getOrCreateBoard(user.id, investigationId),
      InvestigationService.getInvestigationWorkspace(user.id, investigationId),
    ]);
  } catch (error) {
    if (error instanceof AppError && error.statusCode === 404) {
      notFound();
    }
    throw error;
  }

  return (
    <InvestigationBoardCanvas
      initialBoard={board}
      caseTitle={workspace.case.title}
      caseCode={workspace.case.caseCode}
    />
  );
}
