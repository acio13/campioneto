import { queryDatabase } from '../lib/database.mjs';

const championshipId = 'csi-lodi-crema-open-m-gir-2026-2027';

export const championshipQuery = `
  SELECT json_build_object(
    'id', c.id, 'name', c.name, 'category', c.category, 'season', c.season,
    'timeZone', c.time_zone,
    'teams', (
      SELECT coalesce(json_agg(json_build_object('id', t.id, 'name', t.name)
        ORDER BY t.name), '[]'::json)
      FROM campioneto.championship_teams ct
      JOIN campioneto.teams t ON t.id = ct.team_id
      WHERE ct.championship_id = c.id
    ),
    'rounds', (
      SELECT coalesce(json_agg(json_build_object('leg', d.leg, 'matchday', d.matchday)
        ORDER BY CASE d.leg WHEN 'andata' THEN 0 ELSE 1 END, d.matchday), '[]'::json)
      FROM campioneto.matchdays d WHERE d.championship_id = c.id
    ),
    'matches', (
      SELECT coalesce(json_agg(json_build_object(
        'id', m.id, 'leg', m.leg, 'matchday', m.matchday,
        'date', to_char(m.match_date, 'YYYY-MM-DD'),
        'time', to_char(m.match_time, 'HH24:MI'),
        'homeId', m.home_team_id, 'awayId', m.away_team_id,
        'venue', m.venue, 'flagged', m.source_flagged
      ) ORDER BY m.match_date, m.match_time, m.id), '[]'::json)
      FROM campioneto.matches m WHERE m.championship_id = c.id
    ),
    'results', (
      SELECT coalesce(json_agg(json_build_object(
        'matchId', r.match_id, 'homeGoals', r.home_goals, 'awayGoals', r.away_goals
      ) ORDER BY r.match_id), '[]'::json)
      FROM campioneto.results r
      JOIN campioneto.matches m ON m.id = r.match_id
      WHERE m.championship_id = c.id
    )
  ) AS data
  FROM campioneto.championships c WHERE c.id = $1
`;

const json = (body, status = 200, extraHeaders = {}) =>
  Response.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store', ...extraHeaders },
  });

export function createHandler(query, logError = console.error) {
  return async (request) => {
    if (request.method !== 'GET') {
      return json({ error: 'Metodo non consentito.' }, 405, { Allow: 'GET' });
    }
    try {
      // Una singola query mantiene calendario e risultati nello stesso snapshot.
      const rows = await query(championshipQuery, [championshipId]);
      if (rows.length === 0) {
        return json({ error: 'Campionato non trovato nel database.' }, 404);
      }
      return json(rows[0].data);
    } catch {
      // Non registrare errori del driver: possono contenere dettagli della connessione.
      logError('Impossibile leggere il campionato da Neon. Verificare DATABASE_URL e lo schema.');
      return json({ error: 'Database non disponibile. Riprova tra poco.' }, 503);
    }
  };
}

export default createHandler(queryDatabase);
