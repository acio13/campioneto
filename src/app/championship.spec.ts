import { calculateStandings, indexResults, Match, MatchResult, Team } from './championship';
import calendar from './data/calendar.json';
import { RESULTS } from './data/results';

const teams: Team[] = [
  { id: 'a', name: 'Alfa' },
  { id: 'b', name: 'Beta' },
  { id: 'c', name: 'Gamma' },
  { id: 'd', name: 'Delta' },
];
function match(id: string, homeId: string, awayId: string): Match {
  return {
    id,
    homeId,
    awayId,
    leg: 'andata',
    matchday: 1,
    date: '2026-10-19',
    time: '21:00',
    venue: 'Campo',
    flagged: false,
  };
}
const fixtures = [
  match('ab', 'a', 'b'),
  match('bc', 'b', 'c'),
  match('ca', 'c', 'a'),
  match('ad', 'a', 'd'),
  match('bd', 'b', 'd'),
  match('cd', 'c', 'd'),
];
const result = (matchId: string, homeGoals: number, awayGoals: number): MatchResult => ({
  matchId,
  homeGoals,
  awayGoals,
});

describe('Classifica', () => {
  it('includes all teams at zero and shares positions for complete ties', () => {
    const table = calculateStandings(teams, fixtures, []);
    expect(table).toHaveLength(4);
    expect(table.every((row) => row.points === 0 && row.played === 0 && row.position === 1)).toBe(
      true,
    );
    expect(table.map((row) => row.name)).toEqual(['Alfa', 'Beta', 'Delta', 'Gamma']);
  });

  it('calculates wins, draws, losses, goals and points, counting 0-0 as played', () => {
    const table = calculateStandings(teams, fixtures, [
      result('ab', 3, 1),
      result('bc', 0, 0),
      result('ca', 2, 1),
    ]);
    expect(table.find((row) => row.id === 'a')).toMatchObject({
      played: 2,
      won: 1,
      drawn: 0,
      lost: 1,
      goalsFor: 4,
      goalsAgainst: 3,
      goalDifference: 1,
      points: 3,
    });
    expect(table.find((row) => row.id === 'b')).toMatchObject({
      played: 2,
      won: 0,
      drawn: 1,
      lost: 1,
      goalsFor: 1,
      goalsAgainst: 3,
      points: 1,
    });
    expect(table[0].id).toBe('c');
    expect(table.reduce((sum, row) => sum + row.goalsFor, 0)).toBe(
      table.reduce((sum, row) => sum + row.goalsAgainst, 0),
    );
  });

  it('uses direct encounters before overall goal difference', () => {
    const table = calculateStandings(teams, fixtures, [result('ab', 1, 0), result('bc', 10, 0)]);
    expect(table.slice(0, 2).map((row) => row.id)).toEqual(['a', 'b']);
    expect(table[0].headToHead).toBe(3);
    expect(table[1].goalDifference).toBe(9);
  });

  it('uses a mini-table for three or more tied teams, then overall goal difference', () => {
    const table = calculateStandings(teams, fixtures, [
      result('ab', 1, 0),
      result('bc', 2, 0),
      result('ca', 3, 0),
    ]);
    expect(table.slice(0, 3).map((row) => row.id)).toEqual(['c', 'b', 'a']);
    expect(table.slice(0, 3).map((row) => row.headToHead)).toEqual([3, 3, 3]);
  });

  it('uses mini-table points across the entire tied group', () => {
    const table = calculateStandings(teams, fixtures, [
      result('ab', 1, 0),
      result('bc', 1, 0),
      result('ca', 0, 1),
      result('bd', 1, 0),
      result('cd', 1, 0),
      result('ad', 0, 1),
    ]);
    expect(table.slice(0, 2).map((row) => row.id)).toEqual(['a', 'b']);
    expect(table.find((row) => row.id === 'a')?.headToHead).toBe(3);
  });

  it('uses goals scored after goal difference and preserves unresolved ties', () => {
    const table = calculateStandings(teams, fixtures, [
      result('ab', 0, 0),
      result('ad', 2, 1),
      result('bc', 3, 2),
    ]);
    expect(table.slice(0, 2).map((row) => row.id)).toEqual(['b', 'a']);
    const tied = calculateStandings(teams, [match('ab', 'a', 'b')], [result('ab', 1, 1)]);
    expect(tied.slice(0, 2).map((row) => row.position)).toEqual([1, 1]);
    expect(tied[2].position).toBe(3);
  });

  it('counts both legs and recomputes from changed or removed static results', () => {
    const matches = [match('ab', 'a', 'b'), match('ba', 'b', 'a')];
    const first = calculateStandings(teams, matches, [result('ab', 2, 0), result('ba', 1, 1)]);
    expect(first[0]).toMatchObject({ id: 'a', points: 4, headToHead: 0, played: 2 });
    const changed = calculateStandings(teams, matches, [result('ab', 0, 1)]);
    expect(changed[0]).toMatchObject({ id: 'b', points: 3, played: 1 });
    expect(calculateStandings(teams, matches, []).every((row) => row.played === 0)).toBe(true);
  });

  it.each([-1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1])(
    'rejects invalid goals %s',
    (goals) => {
      expect(() => indexResults(fixtures, [result('ab', goals, 0)])).toThrow('Gol non validi');
      expect(() => indexResults(fixtures, [result('ab', 0, goals)])).toThrow('Gol non validi');
    },
  );

  it('rejects missing matches and duplicates rather than quietly changing the table', () => {
    expect(() => indexResults(fixtures, [result('unknown', 1, 0)])).toThrow('inesistente');
    expect(() => indexResults(fixtures, [result('ab', 1, 0), result('ab', 2, 0)])).toThrow(
      'duplicato',
    );
    expect(() => calculateStandings(teams, [match('x', 'a', 'unknown')], [])).toThrow('Calendario');
    expect(() => calculateStandings(teams, [fixtures[0], fixtures[0]], [])).toThrow('Calendario');
  });
});

describe('Calendario del PDF', () => {
  it('contains 12 teams, 22 full matchdays, 132 unique fixtures and a complete double round robin', () => {
    expect(calendar.teams).toHaveLength(12);
    expect(calendar.matches).toHaveLength(132);
    expect(new Set(calendar.matches.map((m) => m.id)).size).toBe(132);
    for (const leg of ['andata', 'ritorno']) {
      for (let day = 1; day <= 11; day++) {
        const matches = calendar.matches.filter((m) => m.leg === leg && m.matchday === day);
        expect(matches).toHaveLength(6);
        expect(new Set(matches.flatMap((m) => [m.homeId, m.awayId])).size).toBe(12);
      }
    }
    for (const home of calendar.teams) {
      for (const away of calendar.teams.filter((team) => team.id !== home.id)) {
        expect(
          calendar.matches.filter((m) => m.homeId === home.id && m.awayId === away.id),
        ).toHaveLength(1);
      }
    }
    expect(() => calculateStandings(calendar.teams, calendar.matches, RESULTS)).not.toThrow();
  });

  it('preserves unusual return rounds, changed venue and dates from the document', () => {
    expect(calendar.matches.find((m) => m.id === '2615R67')).toMatchObject({
      leg: 'ritorno',
      matchday: 1,
      homeId: 'izanese',
      awayId: 'daniel',
      date: '2027-02-02',
    });
    expect(calendar.matches.find((m) => m.id === '2615A8')?.venue).toContain('C.S. Via Roma');
    expect(calendar.matches.find((m) => m.id === '2615R114')).toMatchObject({
      matchday: 8,
      date: '2027-04-01',
      flagged: true,
    });
    expect(calendar.matches.find((m) => m.id === '2615R120')?.date).toBe('2027-04-05');
    expect(calendar.matches.find((m) => m.id === '2615R132')?.date).toBe('2027-04-23');
  });
});
