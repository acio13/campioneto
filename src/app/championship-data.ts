import { calculateStandings, Match, MatchResult, Team } from './championship';

export interface Round {
  leg: 'andata' | 'ritorno';
  matchday: number;
}

export interface ChampionshipData {
  id: string;
  name: string;
  category: string;
  season: string;
  timeZone: string;
  teams: Team[];
  rounds: Round[];
  matches: Match[];
  results: MatchResult[];
}

const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const text = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;
const integer = (value: unknown): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value);
const arrayOf = <T>(value: unknown, guard: (item: unknown) => item is T): value is T[] =>
  Array.isArray(value) && value.every(guard);

function isRound(value: unknown): value is Round {
  return (
    record(value) &&
    (value['leg'] === 'andata' || value['leg'] === 'ritorno') &&
    integer(value['matchday']) &&
    value['matchday'] > 0
  );
}

function isTeam(value: unknown): value is Team {
  return record(value) && text(value['id']) && text(value['name']);
}

function isMatch(value: unknown): value is Match {
  return (
    isRound(value) &&
    record(value) &&
    text(value['id']) &&
    text(value['homeId']) &&
    text(value['awayId']) &&
    text(value['venue']) &&
    typeof value['flagged'] === 'boolean' &&
    typeof value['date'] === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(value['date']) &&
    typeof value['time'] === 'string' &&
    /^([01]\d|2[0-3]):[0-5]\d$/.test(value['time'])
  );
}

function isResult(value: unknown): value is MatchResult {
  return (
    record(value) &&
    text(value['matchId']) &&
    integer(value['homeGoals']) &&
    value['homeGoals'] >= 0 &&
    integer(value['awayGoals']) &&
    value['awayGoals'] >= 0
  );
}

export function parseChampionship(value: unknown): ChampionshipData {
  if (
    !record(value) ||
    !text(value['id']) ||
    !text(value['name']) ||
    !text(value['category']) ||
    !text(value['season']) ||
    value['timeZone'] !== 'Europe/Rome' ||
    !arrayOf(value['teams'], isTeam) ||
    value['teams'].length === 0 ||
    !arrayOf(value['rounds'], isRound) ||
    value['rounds'].length === 0 ||
    !arrayOf(value['matches'], isMatch) ||
    !arrayOf(value['results'], isResult)
  ) {
    throw new Error('Dati del campionato non validi ricevuti dal server.');
  }
  const rounds = new Set(value['rounds'].map((round) => `${round.leg}-${round.matchday}`));
  if (
    rounds.size !== value['rounds'].length ||
    value['matches'].some((match) => !rounds.has(`${match.leg}-${match.matchday}`))
  ) {
    throw new Error('Giornate non valide ricevute dal server.');
  }
  const data: ChampionshipData = {
    id: value['id'],
    name: value['name'],
    category: value['category'],
    season: value['season'],
    timeZone: value['timeZone'],
    teams: value['teams'],
    rounds: value['rounds'],
    matches: value['matches'],
    results: value['results'],
  };
  calculateStandings(data.teams, data.matches, data.results);
  return data;
}
