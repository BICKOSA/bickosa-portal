import { AdminSportsManager } from "@/app/(portal)/portal/admin/sports/_components/admin-sports-manager";
import { requireAdminPageSession } from "@/lib/admin-auth";
import { listSportsAdminData } from "@/lib/sports";

export default async function AdminSportsPage() {
  await requireAdminPageSession();
  const data = await listSportsAdminData();

  return (
    <section className="space-y-4">
      <div>
        <h1 className="font-[var(--font-ui)] text-2xl font-semibold text-[var(--navy-900)]">
          Sports Administration
        </h1>
        <p className="text-sm text-[var(--text-2)]">
          Manage seasons, teams, fixtures, results, and player stats. Standings update automatically from fixture results.
        </p>
      </div>
      <AdminSportsManager
        seasons={data.seasons}
        teams={data.teams}
        fixtures={data.fixtures}
        playerStats={data.playerStats}
        users={data.users}
      />
    </section>
  );
}
