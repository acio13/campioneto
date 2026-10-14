import { parseChampionship } from './championship-data';

const payload = () => ({
  id: 'test',
  name: 'Campionato',
  category: 'Open',
  season: '2026/2027',
  timeZone: 'Europe/Rome',
  teams: [
    { id: 'a', name: 'Alfa' },
    { id: 'b', name: 'Beta' },
  ],
  rounds: [{ leg: 'andata', matchday: 1 }],
  matches: [
    {
      id: 'm1',
      leg: 'andata',
      matchday: 1,
      date: '2026-10-19',
      time: '21:00',
      homeId: 'a',
      awayId: 'b',
      venue: 'Campo',
      flagged: false,
    },
  ],
  results: [{ matchId: 'm1', homeGoals: 0, awayGoals: 0 }],
});

describe('Database payload validation', () => {
  it('accepts complete data and valid scoreless draws', () => {
    expect(parseChampionship(payload()).results[0].homeGoals).toBe(0);
  });
  it.each([
    null,
    {},
    '<html>Not found</html>',
    { ...payload(), teams: [] },
    { ...payload(), timeZone: 'UTC' },
    { ...payload(), results: [{ matchId: 'm1', homeGoals: null, awayGoals: 0 }] },
  ])('rejects incomplete or wrongly typed data', (data) => {
    expect(() => parseChampionship(data)).toThrow();
  });
  it('rejects duplicates, unknown teams, invalid rounds and orphaned scores', () => {
    const duplicate = payload();
    duplicate.matches.push(duplicate.matches[0]);
    expect(() => parseChampionship(duplicate)).toThrow();
    const unknown = payload();
    unknown.matches[0].homeId = 'unknown';
    expect(() => parseChampionship(unknown)).toThrow();
    const round = payload();
    round.matches[0].matchday = 2;
    expect(() => parseChampionship(round)).toThrow();
    const orphan = payload();
    orphan.results[0].matchId = 'missing';
    expect(() => parseChampionship(orphan)).toThrow();
  });
});
