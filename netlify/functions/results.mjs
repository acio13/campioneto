import { queryDatabase } from '../lib/database.mjs';

export const saveResultQuery = `
  INSERT INTO campioneto.results (match_id, home_goals, away_goals)
  SELECT id, $2::integer, $3::integer
  FROM campioneto.matches
  WHERE id = $1 AND championship_id = $4
  ON CONFLICT (match_id) DO UPDATE
  SET home_goals = EXCLUDED.home_goals, away_goals = EXCLUDED.away_goals
  RETURNING match_id AS "matchId", home_goals AS "homeGoals", away_goals AS "awayGoals"
`;

const json = (body, status = 200, headers = {}) =>
  Response.json(body, { status, headers: { 'Cache-Control': 'no-store', ...headers } });
const validGoals = (value) => Number.isInteger(value) && value >= 0 && value <= 2147483647;

export function createHandler(query, logError = console.error) {
  return async (request) => {
    if (request.method !== 'PUT') {
      return json({ error: 'Metodo non consentito.' }, 405, { Allow: 'PUT' });
    }
    if (request.headers.get('content-type')?.split(';')[0].trim() !== 'application/json') {
      return json({ error: 'Inviare un corpo JSON.' }, 415);
    }
    let body;
    try {
      const text = await request.text();
      if (text.length > 1024) return json({ error: 'Richiesta troppo grande.' }, 413);
      body = JSON.parse(text);
    } catch {
      return json({ error: 'JSON non valido.' }, 400);
    }
    if (
      !body ||
      typeof body !== 'object' ||
      Array.isArray(body) ||
      typeof body.matchId !== 'string' ||
      body.matchId.length === 0 ||
      body.matchId.length > 100 ||
      !validGoals(body.homeGoals) ||
      !validGoals(body.awayGoals)
    ) {
      return json(
        { error: 'Indicare una gara e due gol interi non negativi, massimo 2147483647.' },
        400,
      );
    }
    try {
      const rows = await query(saveResultQuery, [
        body.matchId,
        body.homeGoals,
        body.awayGoals,
        'csi-lodi-crema-open-m-gir-2026-2027',
      ]);
      if (rows.length === 0) return json({ error: 'Gara non trovata nel campionato.' }, 404);
      return json(rows[0]);
    } catch {
      logError(
        'Impossibile salvare il risultato su Neon. Verificare connessione e permessi su campioneto.results.',
      );
      return json({ error: 'Salvataggio non riuscito. Verifica la connessione e riprova.' }, 503);
    }
  };
}

export default createHandler(queryDatabase);
