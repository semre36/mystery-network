import React from "react";
import { notFound } from "next/navigation";
import { InvitationService } from "@/modules/teams/services/invitation.service";
import { InvitationLandingClient } from "@/components/teams/invitation-landing-client";

export const dynamic = "force-dynamic";

interface InvitationPageProps {
  params: Promise<{
    token: string;
  }>;
}

export async function generateMetadata({ params }: InvitationPageProps) {
  const { token } = await params;
  try {
    const preview = await InvitationService.getInvitationPreview(token);
    return {
      title: `Squad Commission: ${preview.teamName} | MYSTERY NETWORK`,
      description: `Join squad ${preview.teamName} led by ${preview.leaderCodename}.`,
    };
  } catch {
    return {
      title: "Squad Commission | MYSTERY NETWORK",
    };
  }
}

export default async function InvitationPage({ params }: InvitationPageProps) {
  const { token } = await params;

  let preview;
  try {
    preview = await InvitationService.getInvitationPreview(token);
  } catch {
    notFound();
  }

  return <InvitationLandingClient token={token} preview={preview} />;
}
