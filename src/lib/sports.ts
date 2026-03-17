import { alias } from "drizzle-orm/pg-core";
import { and, asc, desc, eq, or, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  alumniProfiles,
  sportsFixtures,
  sportsPlayerStats,
  sportsSeasons,
  sportsTeams,
  users,
} from "@/lib/db/schema";

type SportType = "football" | "basketball" | "netball" | "volleyball";

export type TeamStanding = {
  teamId: string;
  teamName: string;
  teamSlug: string;
  abbreviation: string;
  badgeColor: string | null;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  rank: number;
  live: boolean;
};

export type FixtureStatus = "scheduled" | "in_progress" | "completed" | "postponed";

export type SportsFixtureItem = {
  id: string;
  seasonId: string;
  matchweek: number | null;
  scheduledAt: Date;
  venue: string | null;
  status: FixtureStatus;
  homeScore: number | null;
  awayScore: number | null;
  homeTeam: {
    id: string;
    name: string;
    slug: string;
    abbreviation: string;
    badgeColor: string | null;
  };
  awayTeam: {
    id: string;
    name: string;
    slug: string;
    abbreviation: string;
    badgeColor: string | null;
  };
};

export type SportsTopScorer = {
  rank: number;
  playerId: string;
  playerName: string;
  teamName: string;
  teamSlug: string;
  goals: number;
};

export type SportsSeasonSummary = {
  id: string;
  name: string;
  year: number;
  sport: SportType;
  isActive: boolean;
  startDate: Date | null;
  endDate: Date | null;
};

export type SportsDashboardData = {
  season: SportsSeasonSummary;
  standings: TeamStanding[];
  topScorers: SportsTopScorer[];
  upcomingFixtures: SportsFixtureItem[];
  hasLiveFixture: boolean;
};

export type SportsSeasonDetailData = {
  season: SportsSeasonSummary;
  standings: TeamStanding[];
  topScorers: SportsTopScorer[];
  fixturesByWeek: Array<{
    matchweek: number | null;
    fixtures: SportsFixtureItem[];
  }>;
  hasLiveFixture: boolean;
};

export type TeamFormResult = "W" | "D" | "L";

export type SportsTeamDetailData = {
  team: {
    id: string;
    name: string;
    slug: string;
    abbreviation: string;
    badgeColor: string | null;
    captain: {
      id: string;
      name: string;
    } | null;
    season: SportsSeasonSummary;
  };
  squad: Array<{
    playerId: string;
    name: string;
    goals: number;
    assists: number;
    appearances: number;
  }>;
  fixtures: SportsFixtureItem[];
  goalsFor: number;
  goalsAgainst: number;
  lastFiveForm: TeamFormResult[];
};

export async function listSportsSeasons(options?: { includeInactive?: boolean }) {
  const includeInactive = options?.includeInactive ?? false;
  return db
    .select({
      id: sportsSeasons.id,
      name: sportsSeasons.name,
      year: sportsSeasons.year,
      sport: sportsSeasons.sport,
      isActive: sportsSeasons.isActive,
      startDate: sportsSeasons.startDate,
      endDate: sportsSeasons.endDate,
    })
    .from(sportsSeasons)
    .where(includeInactive ? undefined : eq(sportsSeasons.isActive, true))
    .orderBy(desc(sportsSeasons.year), desc(sportsSeasons.isActive), asc(sportsSeasons.name));
}

export async function getSeasonByParam(param: string) {
  const numericYear = Number.parseInt(param, 10);
  const isYearParam = Number.isFinite(numericYear) && String(numericYear) === param;

  return db.query.sportsSeasons.findFirst({
    where: isYearParam
      ? or(eq(sportsSeasons.id, param), eq(sportsSeasons.year, numericYear))
      : eq(sportsSeasons.id, param),
  });
}

export async function getActiveSeason() {
  const active = await db.query.sportsSeasons.findFirst({
    where: eq(sportsSeasons.isActive, true),
    orderBy: [desc(sportsSeasons.year)],
  });

  if (active) {
    return active;
  }

  return db.query.sportsSeasons.findFirst({
    orderBy: [desc(sportsSeasons.year)],
  });
}

export async function listFixturesBySeasonId(seasonId: string): Promise<SportsFixtureItem[]> {
  const awayTeams = alias(sportsTeams, "away_teams");
  return db
    .select({
      id: sportsFixtures.id,
      seasonId: sportsFixtures.seasonId,
      matchweek: sportsFixtures.matchweek,
      scheduledAt: sportsFixtures.scheduledAt,
      venue: sportsFixtures.venue,
      status: sportsFixtures.status,
      homeScore: sportsFixtures.homeScore,
      awayScore: sportsFixtures.awayScore,
      homeTeamId: sportsTeams.id,
      homeTeamName: sportsTeams.name,
      homeTeamSlug: sportsTeams.slug,
      homeTeamAbbreviation: sportsTeams.abbreviation,
      homeTeamBadgeColor: sportsTeams.badgeColor,
      awayTeamId: awayTeams.id,
      awayTeamName: awayTeams.name,
      awayTeamSlug: awayTeams.slug,
      awayTeamAbbreviation: awayTeams.abbreviation,
      awayTeamBadgeColor: awayTeams.badgeColor,
    })
    .from(sportsFixtures)
    .innerJoin(sportsTeams, eq(sportsTeams.id, sportsFixtures.homeTeamId))
    .innerJoin(awayTeams, eq(awayTeams.id, sportsFixtures.awayTeamId))
    .where(eq(sportsFixtures.seasonId, seasonId))
    .orderBy(asc(sportsFixtures.scheduledAt), asc(sportsFixtures.matchweek))
    .then((rows) =>
      rows.map((row) => ({
        id: row.id,
        seasonId: row.seasonId,
        matchweek: row.matchweek,
        scheduledAt: row.scheduledAt,
        venue: row.venue,
        status: row.status,
        homeScore: row.homeScore,
        awayScore: row.awayScore,
        homeTeam: {
          id: row.homeTeamId,
          name: row.homeTeamName,
          slug: row.homeTeamSlug,
          abbreviation: row.homeTeamAbbreviation,
          badgeColor: row.homeTeamBadgeColor,
        },
        awayTeam: {
          id: row.awayTeamId,
          name: row.awayTeamName,
          slug: row.awayTeamSlug,
          abbreviation: row.awayTeamAbbreviation,
          badgeColor: row.awayTeamBadgeColor,
        },
      })),
    );
}

async function listTeamsBySeasonId(seasonId: string) {
  return db
    .select({
      id: sportsTeams.id,
      name: sportsTeams.name,
      slug: sportsTeams.slug,
      abbreviation: sportsTeams.abbreviation,
      badgeColor: sportsTeams.badgeColor,
    })
    .from(sportsTeams)
    .where(eq(sportsTeams.seasonId, seasonId))
    .orderBy(asc(sportsTeams.name));
}

export function computeStandings(
  teams: Array<{
    id: string;
    name: string;
    slug: string;
    abbreviation: string;
    badgeColor: string | null;
  }>,
  fixtures: SportsFixtureItem[],
): TeamStanding[] {
  const map = new Map<string, Omit<TeamStanding, "rank">>();

  for (const team of teams) {
    map.set(team.id, {
      teamId: team.id,
      teamName: team.name,
      teamSlug: team.slug,
      abbreviation: team.abbreviation,
      badgeColor: team.badgeColor,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDifference: 0,
      points: 0,
      live: false,
    });
  }

  for (const fixture of fixtures) {
    const home = map.get(fixture.homeTeam.id);
    const away = map.get(fixture.awayTeam.id);
    if (!home || !away) {
      continue;
    }

    if (fixture.status === "in_progress") {
      home.live = true;
      away.live = true;
    }

    if (fixture.status !== "completed") {
      continue;
    }
    if (fixture.homeScore === null || fixture.awayScore === null) {
      continue;
    }

    home.played += 1;
    away.played += 1;
    home.goalsFor += fixture.homeScore;
    home.goalsAgainst += fixture.awayScore;
    away.goalsFor += fixture.awayScore;
    away.goalsAgainst += fixture.homeScore;

    if (fixture.homeScore > fixture.awayScore) {
      home.won += 1;
      home.points += 3;
      away.lost += 1;
    } else if (fixture.homeScore < fixture.awayScore) {
      away.won += 1;
      away.points += 3;
      home.lost += 1;
    } else {
      home.drawn += 1;
      away.drawn += 1;
      home.points += 1;
      away.points += 1;
    }
  }

  const sorted = Array.from(map.values()).map((item) => ({
    ...item,
    goalDifference: item.goalsFor - item.goalsAgainst,
  }));

  sorted.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
    if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
    return a.teamName.localeCompare(b.teamName);
  });

  return sorted.map((item, index) => ({
    ...item,
    rank: index + 1,
  }));
}

export async function getStandingsBySeasonId(seasonId: string): Promise<TeamStanding[]> {
  const [teams, fixtures] = await Promise.all([
    listTeamsBySeasonId(seasonId),
    listFixturesBySeasonId(seasonId),
  ]);
  return computeStandings(teams, fixtures);
}

export async function getTopScorersBySeasonId(seasonId: string, limit = 10): Promise<SportsTopScorer[]> {
  const rows = await db
    .select({
      playerId: users.id,
      playerName: sql<string>`coalesce(${users.name}, ${alumniProfiles.firstName} || ' ' || ${alumniProfiles.lastName})`,
      teamName: sportsTeams.name,
      teamSlug: sportsTeams.slug,
      goals: sportsPlayerStats.goals,
    })
    .from(sportsPlayerStats)
    .innerJoin(users, eq(users.id, sportsPlayerStats.playerId))
    .leftJoin(alumniProfiles, eq(alumniProfiles.userId, users.id))
    .innerJoin(sportsTeams, eq(sportsTeams.id, sportsPlayerStats.teamId))
    .where(eq(sportsPlayerStats.seasonId, seasonId))
    .orderBy(desc(sportsPlayerStats.goals), asc(users.name))
    .limit(limit);

  return rows.map((row, index) => ({
    rank: index + 1,
    playerId: row.playerId,
    playerName: row.playerName?.trim() || "Player",
    teamName: row.teamName,
    teamSlug: row.teamSlug,
    goals: row.goals,
  }));
}

export function groupFixturesByWeek(fixtures: SportsFixtureItem[]) {
  const map = new Map<number | null, SportsFixtureItem[]>();
  for (const fixture of fixtures) {
    const key = fixture.matchweek ?? null;
    const current = map.get(key) ?? [];
    current.push(fixture);
    map.set(key, current);
  }

  return Array.from(map.entries())
    .sort((a, b) => {
      if (a[0] === null && b[0] === null) return 0;
      if (a[0] === null) return 1;
      if (b[0] === null) return -1;
      return a[0] - b[0];
    })
    .map(([matchweek, weekFixtures]) => ({
      matchweek,
      fixtures: weekFixtures.sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime()),
    }));
}

export async function getSportsDashboardData(): Promise<SportsDashboardData | null> {
  const season = await getActiveSeason();
  if (!season) {
    return null;
  }

  const [standings, topScorers, fixtures] = await Promise.all([
    getStandingsBySeasonId(season.id),
    getTopScorersBySeasonId(season.id, 8),
    listFixturesBySeasonId(season.id),
  ]);

  const now = new Date();
  const upcomingFixtures = fixtures
    .filter((fixture) => fixture.status === "scheduled" && fixture.scheduledAt >= now)
    .slice(0, 6);

  return {
    season,
    standings,
    topScorers,
    upcomingFixtures,
    hasLiveFixture: fixtures.some((fixture) => fixture.status === "in_progress"),
  };
}

export async function getSportsSeasonDetailData(param: string): Promise<SportsSeasonDetailData | null> {
  const season = await getSeasonByParam(param);
  if (!season) {
    return null;
  }

  const [standings, topScorers, fixtures] = await Promise.all([
    getStandingsBySeasonId(season.id),
    getTopScorersBySeasonId(season.id, 20),
    listFixturesBySeasonId(season.id),
  ]);

  return {
    season,
    standings,
    topScorers,
    fixturesByWeek: groupFixturesByWeek(fixtures),
    hasLiveFixture: fixtures.some((fixture) => fixture.status === "in_progress"),
  };
}

export async function getSportsTeamDetailBySlug(slug: string): Promise<SportsTeamDetailData | null> {
  const team = await db.query.sportsTeams.findFirst({
    where: eq(sportsTeams.slug, slug),
  });
  if (!team) {
    return null;
  }

  const [season, captain, standings, fixtures, squadRows] = await Promise.all([
    db.query.sportsSeasons.findFirst({ where: eq(sportsSeasons.id, team.seasonId) }),
    team.captainId
      ? db.query.users.findFirst({
          where: eq(users.id, team.captainId),
          columns: { id: true, name: true },
        })
      : Promise.resolve(null),
    getStandingsBySeasonId(team.seasonId),
    listFixturesBySeasonId(team.seasonId),
    db
      .select({
        playerId: users.id,
        playerName: sql<string>`coalesce(${users.name}, ${alumniProfiles.firstName} || ' ' || ${alumniProfiles.lastName})`,
        goals: sportsPlayerStats.goals,
        assists: sportsPlayerStats.assists,
        appearances: sportsPlayerStats.appearances,
      })
      .from(sportsPlayerStats)
      .innerJoin(users, eq(users.id, sportsPlayerStats.playerId))
      .leftJoin(alumniProfiles, eq(alumniProfiles.userId, users.id))
      .where(and(eq(sportsPlayerStats.seasonId, team.seasonId), eq(sportsPlayerStats.teamId, team.id)))
      .orderBy(desc(sportsPlayerStats.appearances), desc(sportsPlayerStats.goals), asc(users.name)),
  ]);

  if (!season) {
    return null;
  }

  const teamStanding = standings.find((row) => row.teamId === team.id);
  const teamFixtures = fixtures.filter(
    (fixture) => fixture.homeTeam.id === team.id || fixture.awayTeam.id === team.id,
  );

  const completed = teamFixtures
    .filter((fixture) => fixture.status === "completed")
    .sort((a, b) => b.scheduledAt.getTime() - a.scheduledAt.getTime())
    .slice(0, 5);

  const form: TeamFormResult[] = completed.map((fixture) => {
    if (fixture.homeScore === null || fixture.awayScore === null) {
      return "D";
    }
    const isHome = fixture.homeTeam.id === team.id;
    const teamScore = isHome ? fixture.homeScore : fixture.awayScore;
    const opponentScore = isHome ? fixture.awayScore : fixture.homeScore;
    if (teamScore > opponentScore) return "W";
    if (teamScore < opponentScore) return "L";
    return "D";
  });

  return {
    team: {
      id: team.id,
      name: team.name,
      slug: team.slug,
      abbreviation: team.abbreviation,
      badgeColor: team.badgeColor,
      captain: captain
        ? {
            id: captain.id,
            name: captain.name ?? "Captain",
          }
        : null,
      season,
    },
    squad: squadRows.map((row) => ({
      playerId: row.playerId,
      name: row.playerName?.trim() || "Player",
      goals: row.goals,
      assists: row.assists,
      appearances: row.appearances,
    })),
    fixtures: teamFixtures,
    goalsFor: teamStanding?.goalsFor ?? 0,
    goalsAgainst: teamStanding?.goalsAgainst ?? 0,
    lastFiveForm: form,
  };
}

export async function listSportsAdminData() {
  const [seasons, teams, fixtures, playerStats, usersList] = await Promise.all([
    listSportsSeasons({ includeInactive: true }),
    db
      .select({
        id: sportsTeams.id,
        name: sportsTeams.name,
        slug: sportsTeams.slug,
        abbreviation: sportsTeams.abbreviation,
        seasonId: sportsTeams.seasonId,
      })
      .from(sportsTeams)
      .orderBy(desc(sportsTeams.createdAt)),
    db
      .select({
        id: sportsFixtures.id,
        seasonId: sportsFixtures.seasonId,
        homeTeamId: sportsFixtures.homeTeamId,
        awayTeamId: sportsFixtures.awayTeamId,
        scheduledAt: sportsFixtures.scheduledAt,
        venue: sportsFixtures.venue,
        status: sportsFixtures.status,
        homeScore: sportsFixtures.homeScore,
        awayScore: sportsFixtures.awayScore,
        matchweek: sportsFixtures.matchweek,
      })
      .from(sportsFixtures)
      .orderBy(desc(sportsFixtures.scheduledAt))
      .limit(100),
    db
      .select({
        id: sportsPlayerStats.id,
        seasonId: sportsPlayerStats.seasonId,
        playerId: sportsPlayerStats.playerId,
        teamId: sportsPlayerStats.teamId,
        goals: sportsPlayerStats.goals,
        assists: sportsPlayerStats.assists,
        appearances: sportsPlayerStats.appearances,
      })
      .from(sportsPlayerStats)
      .orderBy(desc(sportsPlayerStats.updatedAt))
      .limit(100),
    db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
      })
      .from(users)
      .orderBy(asc(users.name))
      .limit(300),
  ]);

  return {
    seasons,
    teams,
    fixtures,
    playerStats,
    users: usersList,
  };
}
