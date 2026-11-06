import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, UserCog, TrendingUp, Award } from "lucide-react";
import { getCurrentUser } from "@/modules/authentication/guards/auth.guard";
import { PlayerService } from "@/modules/players/services/player.service";
import { ProfileForm } from "@/components/player/profile-form";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Investigator Dossier & Settings | MYSTERY NETWORK",
  description: "Configure your detective callsign, preferences, and operative profile",
};

export default async function ProfilePage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/");
  }

  const dossier = await PlayerService.getDossier(user.id);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Navigation Breadcrumb */}
      <div className="flex items-center justify-between">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs font-mono text-slate-400 hover:text-cyan-400 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Dashboard
        </Link>
        <span className="text-[10px] font-mono uppercase tracking-widest text-cyan-400">
          CENTRAL SECURITY CONFIGURATION
        </span>
      </div>

      {/* Page Title */}
      <div className="flex items-center gap-3 border-b border-[#1a233a] pb-4">
        <div className="p-2.5 rounded bg-[#131b2e] border border-[#232f48] text-cyan-400">
          <UserCog className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-100 font-sans">
            Investigator Dossier & Clearance Settings
          </h1>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Manage your operative callsign, field specialization, and user preferences.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/profile/progression"
            className="px-3 py-1.5 rounded-lg bg-cyan-950/60 hover:bg-cyan-900/60 border border-cyan-700/60 text-cyan-300 text-xs font-mono flex items-center gap-1.5 transition-colors"
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Progression & XP</span>
          </Link>
          <Link
            href="/profile/achievements"
            className="px-3 py-1.5 rounded-lg bg-purple-950/60 hover:bg-purple-900/60 border border-purple-700/60 text-purple-300 text-xs font-mono flex items-center gap-1.5 transition-colors"
          >
            <Award className="w-3.5 h-3.5" />
            <span>Accolades</span>
          </Link>
        </div>
      </div>

      {/* Profile Form */}
      <ProfileForm dossier={dossier} />
    </div>
  );
}
