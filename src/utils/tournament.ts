import type { TournamentNode } from "@/api/types";

type Translate = (key: string, values?: Record<string, unknown>) => string;

/** "Final", "Semi-finals", "Round of 16", "Lower round 3", "Round 2" ... */
export function roundLabel(
  bracket: TournamentNode["bracket"],
  round: number,
  upperRounds: number,
  t: Translate
): string {
  if (bracket === "grand_final") return t("Tournament.GrandFinal");
  if (bracket === "lower") return t("Tournament.LowerRound", { n: round });
  if (bracket === "upper") {
    const fromEnd = upperRounds - round;
    if (fromEnd === 0) return t("Tournament.Final");
    if (fromEnd === 1) return t("Tournament.SemiFinals");
    if (fromEnd === 2) return t("Tournament.QuarterFinals");
    return t("Tournament.RoundOf", { n: 2 ** (fromEnd + 1) });
  }
  return t("Tournament.Round", { n: round });
}

/** "A", "B", ... for group 1, 2, ... */
export const groupLetter = (group: number) => String.fromCharCode(64 + group);

/**
 * The ready slots that can start together: earliest rounds first, and no team twice, nor a team still playing
 * another match of the tournament (round robin and group slots are all ready at once).
 */
export function startableNodes(nodes: TournamentNode[]): TournamentNode[] {
  const busy = new Set<number>();
  for (const node of nodes) {
    if (node.status !== "live") continue;
    if (node.team1_id != null) busy.add(node.team1_id);
    if (node.team2_id != null) busy.add(node.team2_id);
  }
  const picked: TournamentNode[] = [];
  const ready = nodes
    .filter(canCreateMatch)
    .sort(
      (a, b) => a.round - b.round || (a.group ?? 0) - (b.group ?? 0) || a.position - b.position
    );
  for (const node of ready) {
    if (busy.has(node.team1_id!) || busy.has(node.team2_id!)) continue;
    busy.add(node.team1_id!);
    busy.add(node.team2_id!);
    picked.push(node);
  }
  return picked;
}

/** A slot can get a match: both teams known, none linked (a cancelled one is unlinked by the API). */
export const canCreateMatch = (node: TournamentNode) =>
  node.status === "ready" &&
  node.match_id == null &&
  node.team1_id != null &&
  node.team2_id != null;
