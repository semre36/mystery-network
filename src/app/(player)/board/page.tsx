import { redirect } from "next/navigation";
import Link from "next/link";
import { Network, ArrowRight } from "lucide-react";
import { requireAuthenticatedUser } from "@/modules/authentication/guards/auth.guard";
import { InvestigationService } from "@/modules/investigations/services/investigation.service";

export const metadata = {
  title: "Investigation Board | MYSTERY NETWORK",
};

export default async function BoardIndexPage() {
  let user;
  try {
    user = await requireAuthenticatedUser();
  } catch {
    redirect("/");
  }

  const { items: investigations } = await InvestigationService.getPlayerInvestigations(user.id);
  const active = investigations.find(
    (inv: any) => inv.status === "IN_PROGRESS" || inv.status === "PAUSED"
  );

  if (active) {
    redirect(`/investigations/${active.id}/board`);
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3 pb-4 border-b border-[#18233a]">
        <Network className="w-6 h-6 text-cyan-400" />
        <div>
          <h1 className="text-xl font-bold text-white font-sans">Investigation Crime Boards</h1>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Select an active investigation session to enter its collaborative corkboard.
          </p>
        </div>
      </div>

      {investigations.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {investigations.map((inv: any) => (
            <Link
              key={inv.id}
              href={`/investigations/${inv.id}/board`}
              className="p-4 rounded-xl bg-[#0c1424] border border-[#1a253c] hover:border-cyan-500/50 transition-all flex items-center justify-between group"
            >
              <div>
                <span className="text-[10px] font-mono text-cyan-400 uppercase">
                  {inv.case.caseCode} • {inv.status}
                </span>
                <h3 className="text-sm font-semibold text-white font-sans mt-1">
                  {inv.case.title}
                </h3>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 group-hover:translate-x-1 transition-all" />
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 p-6 rounded-2xl bg-[#0c1424] border border-[#1a253c] space-y-3">
          <p className="text-sm text-slate-400 font-sans">
            You do not have any active investigations yet.
          </p>
          <Link
            href="/cases"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-mono font-semibold transition-colors"
          >
            Browse Active Cases →
          </Link>
        </div>
      )}
    </div>
  );
}
