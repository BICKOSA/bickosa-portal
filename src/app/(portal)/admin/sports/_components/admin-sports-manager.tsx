"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";

type SeasonRow = {
  id: string;
  name: string;
  year: number;
  sport: "football" | "basketball" | "netball" | "volleyball";
  isActive: boolean;
  startDate: Date | null;
  endDate: Date | null;
};

type TeamRow = {
  id: string;
  name: string;
  slug: string;
  abbreviation: string;
  seasonId: string;
};

type FixtureRow = {
  id: string;
  seasonId: string;
  homeTeamId: string;
  awayTeamId: string;
  scheduledAt: Date;
  venue: string | null;
  status: "scheduled" | "in_progress" | "completed" | "postponed";
  homeScore: number | null;
  awayScore: number | null;
  matchweek: number | null;
};

type PlayerStatRow = {
  id: string;
  seasonId: string;
  playerId: string;
  teamId: string;
  goals: number;
  assists: number;
  appearances: number;
};

type UserOption = {
  id: string;
  name: string | null;
  email: string;
};

type AdminSportsManagerProps = {
  seasons: SeasonRow[];
  teams: TeamRow[];
  fixtures: FixtureRow[];
  playerStats: PlayerStatRow[];
  users: UserOption[];
};

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function toDateTimeLocal(value: Date): string {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export function AdminSportsManager({
  seasons,
  teams,
  fixtures,
  playerStats,
  users,
}: AdminSportsManagerProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [busyAction, setBusyAction] = useState<string | null>(null);

  const sortedTeams = useMemo(() => [...teams].sort((a, b) => a.name.localeCompare(b.name)), [teams]);

  async function runAction(action: string, callback: () => Promise<void>) {
    setBusyAction(action);
    try {
      await callback();
      router.refresh();
    } catch (error) {
      toast({
        title: "Request failed",
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setBusyAction(null);
    }
  }

  return (
    <div className="space-y-5">
      <section className="rounded-[var(--r-xl)] border border-[var(--border)] bg-[var(--white)] p-4 shadow-[var(--shadow-sm)]">
        <h2 className="font-[var(--font-ui)] text-xl font-semibold text-[var(--navy-900)]">Seasons</h2>
        <form
          className="mt-3 grid gap-3 md:grid-cols-3"
          onSubmit={(event) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);
            void runAction("create-season", async () => {
              const payload = {
                name: String(formData.get("name") ?? ""),
                year: Number(formData.get("year") ?? 0),
                sport: String(formData.get("sport") ?? "football"),
                isActive: String(formData.get("isActive") ?? "") === "on",
                startDate: String(formData.get("startDate") ?? "") || undefined,
                endDate: String(formData.get("endDate") ?? "") || undefined,
              };
              const response = await fetch("/api/admin/sports/seasons", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify(payload),
              });
              if (!response.ok) {
                throw new Error("Could not create season.");
              }
              toast({ title: "Season created", variant: "success" });
              event.currentTarget.reset();
            });
          }}
        >
          <Input name="name" label="Season name" placeholder="BICKOSA League" required />
          <Input name="year" label="Year" type="number" min={2000} max={2200} required />
          <label className="flex flex-col gap-1.5 text-sm font-medium text-[var(--text-1)]">
            Sport
            <select
              name="sport"
              className="rounded-[var(--r-md)] border-[1.5px] border-[var(--border)] bg-[var(--white)] px-3 py-2 text-sm"
            >
              <option value="football">Football</option>
              <option value="basketball">Basketball</option>
              <option value="netball">Netball</option>
              <option value="volleyball">Volleyball</option>
            </select>
          </label>
          <Input name="startDate" label="Start date" type="date" />
          <Input name="endDate" label="End date" type="date" />
          <label className="flex items-center gap-2 pt-8 text-sm text-[var(--text-2)]">
            <input type="checkbox" name="isActive" className="size-4" />
            Set active season
          </label>
          <div className="md:col-span-3">
            <Button type="submit" variant="navy" isLoading={busyAction === "create-season"}>
              Create Season
            </Button>
          </div>
        </form>
      </section>

      <section className="rounded-[var(--r-xl)] border border-[var(--border)] bg-[var(--white)] p-4 shadow-[var(--shadow-sm)]">
        <h2 className="font-[var(--font-ui)] text-xl font-semibold text-[var(--navy-900)]">Teams</h2>
        <form
          className="mt-3 grid gap-3 md:grid-cols-3"
          onSubmit={(event) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);
            const name = String(formData.get("name") ?? "");
            const providedSlug = String(formData.get("slug") ?? "");
            const slug = slugify(providedSlug || name);
            void runAction("create-team", async () => {
              const payload = {
                seasonId: String(formData.get("seasonId") ?? ""),
                name,
                slug,
                abbreviation: String(formData.get("abbreviation") ?? ""),
                badgeColor: String(formData.get("badgeColor") ?? ""),
                captainId: String(formData.get("captainId") ?? "") || undefined,
              };
              const response = await fetch("/api/admin/sports/teams", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify(payload),
              });
              if (!response.ok) throw new Error("Could not create team.");
              toast({ title: "Team created", variant: "success" });
              event.currentTarget.reset();
            });
          }}
        >
          <label className="flex flex-col gap-1.5 text-sm font-medium text-[var(--text-1)]">
            Season
            <select
              name="seasonId"
              required
              className="rounded-[var(--r-md)] border-[1.5px] border-[var(--border)] bg-[var(--white)] px-3 py-2 text-sm"
            >
              <option value="">Select season</option>
              {seasons.map((season) => (
                <option key={season.id} value={season.id}>
                  {season.name} ({season.year})
                </option>
              ))}
            </select>
          </label>
          <Input name="name" label="Team name" required />
          <Input name="slug" label="Slug (optional)" placeholder="auto-from-name" />
          <Input name="abbreviation" label="Abbreviation" maxLength={4} required />
          <Input name="badgeColor" label="Badge color" placeholder="#1a3060" />
          <label className="flex flex-col gap-1.5 text-sm font-medium text-[var(--text-1)]">
            Captain
            <select
              name="captainId"
              className="rounded-[var(--r-md)] border-[1.5px] border-[var(--border)] bg-[var(--white)] px-3 py-2 text-sm"
            >
              <option value="">No captain</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {(user.name || user.email).trim()}
                </option>
              ))}
            </select>
          </label>
          <div className="md:col-span-3">
            <Button type="submit" variant="navy" isLoading={busyAction === "create-team"}>
              Create Team
            </Button>
          </div>
        </form>
      </section>

      <section className="rounded-[var(--r-xl)] border border-[var(--border)] bg-[var(--white)] p-4 shadow-[var(--shadow-sm)]">
        <h2 className="font-[var(--font-ui)] text-xl font-semibold text-[var(--navy-900)]">Fixtures</h2>
        <form
          className="mt-3 grid gap-3 md:grid-cols-3"
          onSubmit={(event) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);
            void runAction("create-fixture", async () => {
              const payload = {
                seasonId: String(formData.get("seasonId") ?? ""),
                homeTeamId: String(formData.get("homeTeamId") ?? ""),
                awayTeamId: String(formData.get("awayTeamId") ?? ""),
                matchweek: Number(formData.get("matchweek") ?? 0) || undefined,
                scheduledAt: String(formData.get("scheduledAt") ?? ""),
                venue: String(formData.get("venue") ?? ""),
              };
              const response = await fetch("/api/admin/sports/fixtures", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify(payload),
              });
              if (!response.ok) throw new Error("Could not create fixture.");
              toast({ title: "Fixture scheduled", variant: "success" });
              event.currentTarget.reset();
            });
          }}
        >
          <label className="flex flex-col gap-1.5 text-sm font-medium text-[var(--text-1)]">
            Season
            <select
              name="seasonId"
              required
              className="rounded-[var(--r-md)] border-[1.5px] border-[var(--border)] bg-[var(--white)] px-3 py-2 text-sm"
            >
              <option value="">Select season</option>
              {seasons.map((season) => (
                <option key={season.id} value={season.id}>
                  {season.name} ({season.year})
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium text-[var(--text-1)]">
            Home team
            <select
              name="homeTeamId"
              required
              className="rounded-[var(--r-md)] border-[1.5px] border-[var(--border)] bg-[var(--white)] px-3 py-2 text-sm"
            >
              <option value="">Select team</option>
              {sortedTeams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium text-[var(--text-1)]">
            Away team
            <select
              name="awayTeamId"
              required
              className="rounded-[var(--r-md)] border-[1.5px] border-[var(--border)] bg-[var(--white)] px-3 py-2 text-sm"
            >
              <option value="">Select team</option>
              {sortedTeams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
          </label>
          <Input name="matchweek" label="Matchweek" type="number" min={1} />
          <Input name="scheduledAt" label="Date & time" type="datetime-local" required />
          <Input name="venue" label="Venue" />
          <div className="md:col-span-3">
            <Button type="submit" variant="navy" isLoading={busyAction === "create-fixture"}>
              Schedule Fixture
            </Button>
          </div>
        </form>

        <div className="mt-5 rounded-[var(--r-md)] border border-[var(--border)] bg-[var(--surface-2)] p-3">
          <h3 className="text-sm font-semibold text-[var(--text-1)]">Record Result</h3>
          <form
            className="mt-2 grid gap-3 md:grid-cols-4"
            onSubmit={(event) => {
              event.preventDefault();
              const formData = new FormData(event.currentTarget);
              const fixtureId = String(formData.get("fixtureId") ?? "");
              const homeScore = Number(formData.get("homeScore") ?? 0);
              const awayScore = Number(formData.get("awayScore") ?? 0);
              if (!fixtureId) return;
              void runAction("record-result", async () => {
                const response = await fetch(`/api/admin/sports/fixtures/${fixtureId}/result`, {
                  method: "PATCH",
                  headers: { "content-type": "application/json" },
                  body: JSON.stringify({ homeScore, awayScore }),
                });
                if (!response.ok) throw new Error("Could not save result.");
                toast({ title: "Result saved", variant: "success" });
                event.currentTarget.reset();
              });
            }}
          >
            <label className="md:col-span-2 flex flex-col gap-1.5 text-sm font-medium text-[var(--text-1)]">
              Fixture
              <select
                name="fixtureId"
                required
                className="rounded-[var(--r-md)] border-[1.5px] border-[var(--border)] bg-[var(--white)] px-3 py-2 text-sm"
              >
                <option value="">Select fixture</option>
                {fixtures.map((fixture) => {
                  const home = teams.find((team) => team.id === fixture.homeTeamId)?.name ?? "Home";
                  const away = teams.find((team) => team.id === fixture.awayTeamId)?.name ?? "Away";
                  return (
                    <option key={fixture.id} value={fixture.id}>
                      {home} vs {away} · {toDateTimeLocal(fixture.scheduledAt)}
                    </option>
                  );
                })}
              </select>
            </label>
            <Input name="homeScore" label="Home score" type="number" min={0} required />
            <Input name="awayScore" label="Away score" type="number" min={0} required />
            <div className="md:col-span-4">
              <Button type="submit" variant="outline" isLoading={busyAction === "record-result"}>
                Save Result (sets FT)
              </Button>
            </div>
          </form>
        </div>
      </section>

      <section className="rounded-[var(--r-xl)] border border-[var(--border)] bg-[var(--white)] p-4 shadow-[var(--shadow-sm)]">
        <h2 className="font-[var(--font-ui)] text-xl font-semibold text-[var(--navy-900)]">Player Stats</h2>
        <form
          className="mt-3 grid gap-3 md:grid-cols-3"
          onSubmit={(event) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);
            void runAction("save-player-stats", async () => {
              const payload = {
                seasonId: String(formData.get("seasonId") ?? ""),
                playerId: String(formData.get("playerId") ?? ""),
                teamId: String(formData.get("teamId") ?? ""),
                goals: Number(formData.get("goals") ?? 0),
                assists: Number(formData.get("assists") ?? 0),
                appearances: Number(formData.get("appearances") ?? 0),
                yellowCards: Number(formData.get("yellowCards") ?? 0),
                redCards: Number(formData.get("redCards") ?? 0),
              };
              const response = await fetch("/api/admin/sports/player-stats", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify(payload),
              });
              if (!response.ok) throw new Error("Could not save player stats.");
              toast({ title: "Player stats saved", variant: "success" });
              event.currentTarget.reset();
            });
          }}
        >
          <label className="flex flex-col gap-1.5 text-sm font-medium text-[var(--text-1)]">
            Season
            <select
              name="seasonId"
              required
              className="rounded-[var(--r-md)] border-[1.5px] border-[var(--border)] bg-[var(--white)] px-3 py-2 text-sm"
            >
              <option value="">Select season</option>
              {seasons.map((season) => (
                <option key={season.id} value={season.id}>
                  {season.name} ({season.year})
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium text-[var(--text-1)]">
            Team
            <select
              name="teamId"
              required
              className="rounded-[var(--r-md)] border-[1.5px] border-[var(--border)] bg-[var(--white)] px-3 py-2 text-sm"
            >
              <option value="">Select team</option>
              {sortedTeams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium text-[var(--text-1)]">
            Player
            <select
              name="playerId"
              required
              className="rounded-[var(--r-md)] border-[1.5px] border-[var(--border)] bg-[var(--white)] px-3 py-2 text-sm"
            >
              <option value="">Select player</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {(user.name || user.email).trim()}
                </option>
              ))}
            </select>
          </label>
          <Input name="goals" label="Goals" type="number" min={0} defaultValue="0" />
          <Input name="assists" label="Assists" type="number" min={0} defaultValue="0" />
          <Input name="appearances" label="Appearances" type="number" min={0} defaultValue="0" />
          <Input name="yellowCards" label="Yellow cards" type="number" min={0} defaultValue="0" />
          <Input name="redCards" label="Red cards" type="number" min={0} defaultValue="0" />
          <div className="md:col-span-3">
            <Button type="submit" variant="outline" isLoading={busyAction === "save-player-stats"}>
              Save Player Stats
            </Button>
          </div>
        </form>
        <p className="mt-3 text-xs text-[var(--text-3)]">
          Existing stat rows loaded: {playerStats.length.toLocaleString()}.
        </p>
      </section>
    </div>
  );
}
