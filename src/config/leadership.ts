export type LeadershipRole =
  | "President"
  | "Vice President"
  | "Secretary General"
  | "Treasurer"
  | "Publicity Secretary"
  | "Organizing Secretary";

export type LeadershipMemberConfig = {
  alumniProfileId: string;
  name: string;
  role: LeadershipRole;
  classYear: number;
};

/**
 * Caption shown above the Executive Committee card on the governance page.
 * Update this when a new committee is elected and the live data below is
 * repopulated from real alumni profiles.
 */
export const CURRENT_ELECTION_CYCLE = "Awaiting current election results";

/**
 * Hardcoded fallback committee. Kept empty so we never render stale alumni as
 * "current" leadership. The page falls back to a clean empty state, and the
 * Current Leadership block above it (powered by getCurrentLeadership) picks
 * up the real committee from published election results once available.
 */
export const leadershipCommittee: LeadershipMemberConfig[] = [];
