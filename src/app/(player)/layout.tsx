import { redirect } from "next/navigation";
import { getCurrentUser } from "@/modules/authentication/guards/auth.guard";
import { PlayerService } from "@/modules/players/services/player.service";
import { AppShell } from "@/components/layouts/app-shell";

export const dynamic = "force-dynamic";

export default async function PlayerLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/");
  }

  // Retrieve complete dossier for the authenticated player
  const dossier = await PlayerService.getDossier(user.id);

  return <AppShell dossier={dossier}>{children}</AppShell>;
}
