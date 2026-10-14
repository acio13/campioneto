export interface Team {
  id: string;
  name: string;
}

export interface Match {
  id: string;
  leg: string;
  matchday: number;
  date: string;
  time: string;
  homeId: string;
  awayId: string;
  venue: string;
  flagged: boolean;
}

export interface MatchResult {
  matchId: string;
  homeGoals: number;
  awayGoals: number;
}

export interface Standing extends Team {
  position: number;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  headToHead: number;
}

export function indexResults(
  matches: readonly Match[],
  results: readonly MatchResult[],
): ReadonlyMap<string, MatchResult> {
  const matchIds = new Set(matches.map((match) => match.id));
  const indexed = new Map<string, MatchResult>();
  for (const result of results) {
    if (!matchIds.has(result.matchId)) {
      throw new Error(`Risultato associato a una gara inesistente: ${result.matchId}`);
    }
    if (indexed.has(result.matchId)) {
      throw new Error(`Risultato duplicato per la gara ${result.matchId}`);
    }
    if (
      !Number.isSafeInteger(result.homeGoals) ||
      result.homeGoals < 0 ||
      !Number.isSafeInteger(result.awayGoals) ||
      result.awayGoals < 0
    ) {
      throw new Error(`Gol non validi per la gara ${result.matchId}: usare interi non negativi.`);
    }
    indexed.set(result.matchId, result);
  }
  return indexed;
}

export function calculateStandings(
  teams: readonly Team[],
  matches: readonly Match[],
  results: readonly MatchResult[],
): Standing[] {
  const indexed = indexResults(matches, results);
  const table = new Map<string, Standing>();
  for (const team of teams) {
    if (table.has(team.id)) throw new Error(`Squadra duplicata: ${team.id}`);
    table.set(team.id, {
      ...team,
      position: 0,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDifference: 0,
      points: 0,
      headToHead: 0,
    });
  }
  const matchIds = new Set<string>();
  for (const match of matches) {
    const home = table.get(match.homeId);
    const away = table.get(match.awayId);
    if (!home || !away || home.id === away.id || matchIds.has(match.id)) {
      throw new Error(`Calendario non valido per la gara ${match.id}`);
    }
    matchIds.add(match.id);
    const result = indexed.get(match.id);
    if (!result) continue;
    home.played++;
    away.played++;
    home.goalsFor += result.homeGoals;
    home.goalsAgainst += result.awayGoals;
    away.goalsFor += result.awayGoals;
    away.goalsAgainst += result.homeGoals;
    if (result.homeGoals === result.awayGoals) {
      home.drawn++;
      away.drawn++;
      home.points++;
      away.points++;
    } else {
      const winner = result.homeGoals > result.awayGoals ? home : away;
      const loser = winner === home ? away : home;
      winner.won++;
      winner.points += 3;
      loser.lost++;
    }
  }

  // Mini-classifica fra tutte le squadre con gli stessi punti generali.
  for (const match of matches) {
    const result = indexed.get(match.id);
    if (!result) continue;
    const home = table.get(match.homeId)!;
    const away = table.get(match.awayId)!;
    if (home.points !== away.points) continue;
    home.headToHead +=
      result.homeGoals > result.awayGoals ? 3 : result.homeGoals === result.awayGoals ? 1 : 0;
    away.headToHead +=
      result.awayGoals > result.homeGoals ? 3 : result.homeGoals === result.awayGoals ? 1 : 0;
  }

  const compare = (a: Standing, b: Standing) =>
    b.points - a.points ||
    b.headToHead - a.headToHead ||
    b.goalDifference - a.goalDifference ||
    b.goalsFor - a.goalsFor;
  const standings = [...table.values()];
  for (const row of standings) row.goalDifference = row.goalsFor - row.goalsAgainst;
  standings.sort((a, b) => compare(a, b) || a.name.localeCompare(b.name, 'it'));
  standings.forEach((row, index) => {
    const previous = standings[index - 1];
    row.position = previous && compare(previous, row) === 0 ? previous.position : index + 1;
  });
  return standings;
}
