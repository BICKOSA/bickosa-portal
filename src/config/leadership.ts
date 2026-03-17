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

export const CURRENT_ELECTION_CYCLE = "Elected for 2024-2026 term";

export const leadershipCommittee: LeadershipMemberConfig[] = [
  {
    alumniProfileId: "00000000-0000-0000-0000-000000000001",
    name: "Daniel Ssenkumba",
    role: "President",
    classYear: 2002,
  },
  {
    alumniProfileId: "00000000-0000-0000-0000-000000000002",
    name: "Maria Nakitto",
    role: "Vice President",
    classYear: 2005,
  },
  {
    alumniProfileId: "00000000-0000-0000-0000-000000000003",
    name: "Peter Kato",
    role: "Secretary General",
    classYear: 2007,
  },
  {
    alumniProfileId: "00000000-0000-0000-0000-000000000004",
    name: "Grace Namusoke",
    role: "Treasurer",
    classYear: 2004,
  },
  {
    alumniProfileId: "00000000-0000-0000-0000-000000000005",
    name: "Ronald Mugerwa",
    role: "Publicity Secretary",
    classYear: 2010,
  },
  {
    alumniProfileId: "00000000-0000-0000-0000-000000000006",
    name: "Stella Atukunda",
    role: "Organizing Secretary",
    classYear: 2009,
  },
];
