-- Campioneto - PostgreSQL (UTF-8).
-- Eseguire in un database gia' creato, con un utente autorizzato a creare schemi:
-- psql -h localhost -U nome_utente -d nome_database -v ON_ERROR_STOP=1 -f database/campioneto.postgresql.sql
-- Prima inizializzazione soltanto: se lo schema esiste, lo script fallisce senza
-- sovrascrivere dati. Non contiene DROP, credenziali o risultati inventati.
-- L'app Angular non viene collegata al database da questo script.
-- Fonte: Calendario_137_CAC_Open_M_GIR-20261014_0949.pdf, elaborato il 14/10/2026 09:49.
-- Date e orari sono locali italiani (Europe/Rome), non timestamp UTC.
-- Il ritorno conserva l'ordine originale del PDF, diverso dall'andata.

BEGIN;
SET LOCAL client_encoding = 'UTF8';
CREATE SCHEMA campioneto;

CREATE TABLE campioneto.championships (
  id text PRIMARY KEY,
  name text NOT NULL CHECK (btrim(name) <> ''),
  category text NOT NULL,
  season text NOT NULL,
  time_zone text NOT NULL DEFAULT 'Europe/Rome',
  source_document text NOT NULL,
  source_published_at timestamp without time zone NOT NULL
);

CREATE TABLE campioneto.teams (
  id text PRIMARY KEY,
  name text NOT NULL CHECK (btrim(name) <> '')
);

CREATE TABLE campioneto.championship_teams (
  championship_id text NOT NULL REFERENCES campioneto.championships (id),
  team_id text NOT NULL REFERENCES campioneto.teams (id),
  PRIMARY KEY (championship_id, team_id)
);

CREATE TABLE campioneto.matchdays (
  championship_id text NOT NULL REFERENCES campioneto.championships (id),
  leg text NOT NULL CHECK (leg IN ('andata', 'ritorno')),
  matchday smallint NOT NULL CHECK (matchday BETWEEN 1 AND 11),
  PRIMARY KEY (championship_id, leg, matchday)
);

CREATE TABLE campioneto.matches (
  id text PRIMARY KEY,
  championship_id text NOT NULL,
  leg text NOT NULL,
  matchday smallint NOT NULL,
  match_date date NOT NULL,
  match_time time without time zone NOT NULL,
  home_team_id text NOT NULL,
  away_team_id text NOT NULL,
  venue text NOT NULL CHECK (btrim(venue) <> ''),
  source_flagged boolean NOT NULL DEFAULT false,
  FOREIGN KEY (championship_id, leg, matchday)
    REFERENCES campioneto.matchdays (championship_id, leg, matchday),
  FOREIGN KEY (championship_id, home_team_id)
    REFERENCES campioneto.championship_teams (championship_id, team_id),
  FOREIGN KEY (championship_id, away_team_id)
    REFERENCES campioneto.championship_teams (championship_id, team_id),
  CHECK (home_team_id <> away_team_id)
);

CREATE INDEX matches_matchday_idx ON campioneto.matches (championship_id, leg, matchday);
CREATE INDEX matches_home_team_idx ON campioneto.matches (championship_id, home_team_id);
CREATE INDEX matches_away_team_idx ON campioneto.matches (championship_id, away_team_id);

CREATE TABLE campioneto.results (
  match_id text PRIMARY KEY REFERENCES campioneto.matches (id),
  home_goals integer NOT NULL CHECK (home_goals >= 0),
  away_goals integer NOT NULL CHECK (away_goals >= 0)
);

COMMENT ON TABLE campioneto.results IS
  'Solo gare concluse: riga assente = risultato non pubblicato; 0-0 = gara giocata.';
COMMENT ON COLUMN campioneto.matches.source_flagged IS
  'Simbolo (!) presente nel PDF; il documento non ne specifica il significato.';

INSERT INTO campioneto.championships (id, name, category, season, source_document, source_published_at) VALUES
  ('csi-lodi-crema-open-m-gir-2026-2027', 'CSI Lodi/Crema - Campionato di Calcio a 5', 'Open M / GIR', '2026/2027', 'Calendario_137_CAC_Open_M_GIR-20261014_0949.pdf', TIMESTAMP '2026-10-14 09:49:00');

INSERT INTO campioneto.teams (id, name) VALUES
  ('atletico-gerre', 'Atletico Gerre'),
  ('tigers', 'Polisportiva Tigers Casalmaiocco Sordio A.S.D.'),
  ('spartak', 'Spartak Comazzo'),
  ('daniel', 'Daniel San Zelo'),
  ('don-milani', 'Don Lorenzo Milani Club'),
  ('atalantina', 'Atalantina'),
  ('marescoglio', 'Marescoglio'),
  ('petrarca', 'La Petrarca Pub'),
  ('izanese', 'Izanese'),
  ('mirmidoni', 'Mirmidoni'),
  ('dispettosi', 'U.S. i Dispettosi'),
  ('lodifutsal', 'Lodifutsal 2009');

INSERT INTO campioneto.championship_teams (championship_id, team_id) VALUES
  ('csi-lodi-crema-open-m-gir-2026-2027', 'atletico-gerre'),
  ('csi-lodi-crema-open-m-gir-2026-2027', 'tigers'),
  ('csi-lodi-crema-open-m-gir-2026-2027', 'spartak'),
  ('csi-lodi-crema-open-m-gir-2026-2027', 'daniel'),
  ('csi-lodi-crema-open-m-gir-2026-2027', 'don-milani'),
  ('csi-lodi-crema-open-m-gir-2026-2027', 'atalantina'),
  ('csi-lodi-crema-open-m-gir-2026-2027', 'marescoglio'),
  ('csi-lodi-crema-open-m-gir-2026-2027', 'petrarca'),
  ('csi-lodi-crema-open-m-gir-2026-2027', 'izanese'),
  ('csi-lodi-crema-open-m-gir-2026-2027', 'mirmidoni'),
  ('csi-lodi-crema-open-m-gir-2026-2027', 'dispettosi'),
  ('csi-lodi-crema-open-m-gir-2026-2027', 'lodifutsal');

INSERT INTO campioneto.matchdays (championship_id, leg, matchday) VALUES
  ('csi-lodi-crema-open-m-gir-2026-2027', 'andata', 1),
  ('csi-lodi-crema-open-m-gir-2026-2027', 'andata', 2),
  ('csi-lodi-crema-open-m-gir-2026-2027', 'andata', 3),
  ('csi-lodi-crema-open-m-gir-2026-2027', 'andata', 4),
  ('csi-lodi-crema-open-m-gir-2026-2027', 'andata', 5),
  ('csi-lodi-crema-open-m-gir-2026-2027', 'andata', 6),
  ('csi-lodi-crema-open-m-gir-2026-2027', 'andata', 7),
  ('csi-lodi-crema-open-m-gir-2026-2027', 'andata', 8),
  ('csi-lodi-crema-open-m-gir-2026-2027', 'andata', 9),
  ('csi-lodi-crema-open-m-gir-2026-2027', 'andata', 10),
  ('csi-lodi-crema-open-m-gir-2026-2027', 'andata', 11),
  ('csi-lodi-crema-open-m-gir-2026-2027', 'ritorno', 1),
  ('csi-lodi-crema-open-m-gir-2026-2027', 'ritorno', 2),
  ('csi-lodi-crema-open-m-gir-2026-2027', 'ritorno', 3),
  ('csi-lodi-crema-open-m-gir-2026-2027', 'ritorno', 4),
  ('csi-lodi-crema-open-m-gir-2026-2027', 'ritorno', 5),
  ('csi-lodi-crema-open-m-gir-2026-2027', 'ritorno', 6),
  ('csi-lodi-crema-open-m-gir-2026-2027', 'ritorno', 7),
  ('csi-lodi-crema-open-m-gir-2026-2027', 'ritorno', 8),
  ('csi-lodi-crema-open-m-gir-2026-2027', 'ritorno', 9),
  ('csi-lodi-crema-open-m-gir-2026-2027', 'ritorno', 10),
  ('csi-lodi-crema-open-m-gir-2026-2027', 'ritorno', 11);

INSERT INTO campioneto.matches (id, championship_id, leg, matchday, match_date, match_time, home_team_id, away_team_id, venue, source_flagged) VALUES
  ('2615A1', 'csi-lodi-crema-open-m-gir-2026-2027', 'andata', 1, DATE '2026-10-19', TIME '21:00', 'atletico-gerre', 'tigers', 'Campo Comunale Via Roma - 26862 Guardamiglio Lo', false),
  ('2615A2', 'csi-lodi-crema-open-m-gir-2026-2027', 'andata', 1, DATE '2026-10-23', TIME '21:00', 'spartak', 'daniel', 'Palestra Comunale Piazza Libertà - 26833 Merlino Lo', true),
  ('2615A3', 'csi-lodi-crema-open-m-gir-2026-2027', 'andata', 1, DATE '2026-10-20', TIME '22:00', 'don-milani', 'atalantina', 'Palazzetto Via F. Coppi - 26812 Borghetto Lodigiano Lo', false),
  ('2615A4', 'csi-lodi-crema-open-m-gir-2026-2027', 'andata', 1, DATE '2026-10-20', TIME '21:15', 'marescoglio', 'petrarca', 'Oratorio Castelnuovo Via Zambellini - 26013 Crema', false),
  ('2615A5', 'csi-lodi-crema-open-m-gir-2026-2027', 'andata', 1, DATE '2026-10-20', TIME '21:30', 'izanese', 'mirmidoni', 'Palestra Comunale Viale Europa, 2 - 26010 Izano Cr', false),
  ('2615A6', 'csi-lodi-crema-open-m-gir-2026-2027', 'andata', 1, DATE '2026-10-22', TIME '21:30', 'dispettosi', 'lodifutsal', 'Palestra Comunale Via Dell''Incastrone - 26010 Casaletto Ceredano Cr', false),
  ('2615A10', 'csi-lodi-crema-open-m-gir-2026-2027', 'andata', 2, DATE '2026-10-29', TIME '21:30', 'petrarca', 'dispettosi', 'Palazzetto Via F. Coppi - 26812 Borghetto Lodigiano Lo', false),
  ('2615A11', 'csi-lodi-crema-open-m-gir-2026-2027', 'andata', 2, DATE '2026-10-29', TIME '20:30', 'tigers', 'atalantina', 'Palestra Comunale Via Mazzini - 26858 Sordio Lo', false),
  ('2615A12', 'csi-lodi-crema-open-m-gir-2026-2027', 'andata', 2, DATE '2026-10-29', TIME '20:30', 'mirmidoni', 'lodifutsal', 'Palestra Comunale Piazza Libertà - 26833 Merlino Lo', false),
  ('2615A7', 'csi-lodi-crema-open-m-gir-2026-2027', 'andata', 2, DATE '2026-10-27', TIME '21:15', 'marescoglio', 'daniel', 'Oratorio Castelnuovo Via Zambellini - 26013 Crema', false),
  ('2615A8', 'csi-lodi-crema-open-m-gir-2026-2027', 'andata', 2, DATE '2026-10-26', TIME '21:00', 'atletico-gerre', 'izanese', 'C.S. Via Roma, 2 - 26862 Guardamiglio Lo', true),
  ('2615A9', 'csi-lodi-crema-open-m-gir-2026-2027', 'andata', 2, DATE '2026-10-27', TIME '22:00', 'don-milani', 'spartak', 'Palazzetto Via F. Coppi - 26812 Borghetto Lodigiano Lo', true),
  ('2615A13', 'csi-lodi-crema-open-m-gir-2026-2027', 'andata', 3, DATE '2026-11-02', TIME '21:45', 'daniel', 'atletico-gerre', 'Palestra Comunale Via Cassanello 1 - 26839 Zelo Buon Persico Lo', false),
  ('2615A14', 'csi-lodi-crema-open-m-gir-2026-2027', 'andata', 3, DATE '2026-11-03', TIME '21:15', 'marescoglio', 'dispettosi', 'Oratorio Castelnuovo Via Zambellini - 26013 Crema', false),
  ('2615A15', 'csi-lodi-crema-open-m-gir-2026-2027', 'andata', 3, DATE '2026-11-03', TIME '21:30', 'izanese', 'don-milani', 'Palestra Comunale Viale Europa, 2 - 26010 Izano Cr', false),
  ('2615A16', 'csi-lodi-crema-open-m-gir-2026-2027', 'andata', 3, DATE '2026-11-05', TIME '21:30', 'petrarca', 'atalantina', 'Palazzetto Via F. Coppi - 26812 Borghetto Lodigiano Lo', false),
  ('2615A17', 'csi-lodi-crema-open-m-gir-2026-2027', 'andata', 3, DATE '2026-11-05', TIME '20:30', 'mirmidoni', 'tigers', 'Palestra Comunale Piazza Libertà - 26833 Merlino Lo', false),
  ('2615A18', 'csi-lodi-crema-open-m-gir-2026-2027', 'andata', 3, DATE '2026-11-06', TIME '21:00', 'spartak', 'lodifutsal', 'Palestra Comunale Piazza Libertà - 26833 Merlino Lo', true),
  ('2615A19', 'csi-lodi-crema-open-m-gir-2026-2027', 'andata', 4, DATE '2026-11-09', TIME '21:00', 'atletico-gerre', 'mirmidoni', 'Campo Comunale Via Roma - 26862 Guardamiglio Lo', false),
  ('2615A20', 'csi-lodi-crema-open-m-gir-2026-2027', 'andata', 4, DATE '2026-11-10', TIME '22:30', 'atalantina', 'izanese', 'C.S. Enzo Saronni Via Convento 11 - 26010 Pianengo Cr', false),
  ('2615A21', 'csi-lodi-crema-open-m-gir-2026-2027', 'andata', 4, DATE '2026-11-10', TIME '22:00', 'don-milani', 'marescoglio', 'Palazzetto Via F. Coppi - 26812 Borghetto Lodigiano Lo', false),
  ('2615A22', 'csi-lodi-crema-open-m-gir-2026-2027', 'andata', 4, DATE '2026-11-12', TIME '20:30', 'tigers', 'spartak', 'Palestra Comunale Via Mazzini - 26858 Sordio Lo', false),
  ('2615A23', 'csi-lodi-crema-open-m-gir-2026-2027', 'andata', 4, DATE '2026-11-12', TIME '21:30', 'dispettosi', 'daniel', 'Palestra Comunale Via Dell''Incastrone - 26010 Casaletto Ceredano Cr', false),
  ('2615A24', 'csi-lodi-crema-open-m-gir-2026-2027', 'andata', 4, DATE '2026-11-13', TIME '22:00', 'lodifutsal', 'petrarca', 'Palestra Com. Via per Cassino 20 - 26837 Mulazzano Lo', false),
  ('2615A25', 'csi-lodi-crema-open-m-gir-2026-2027', 'andata', 5, DATE '2026-11-16', TIME '21:00', 'atletico-gerre', 'atalantina', 'Campo Comunale Via Roma - 26862 Guardamiglio Lo', false),
  ('2615A26', 'csi-lodi-crema-open-m-gir-2026-2027', 'andata', 5, DATE '2026-11-16', TIME '21:45', 'daniel', 'lodifutsal', 'Palestra Comunale Via Cassanello 1 - 26839 Zelo Buon Persico Lo', false),
  ('2615A27', 'csi-lodi-crema-open-m-gir-2026-2027', 'andata', 5, DATE '2026-11-17', TIME '21:15', 'marescoglio', 'tigers', 'Oratorio Castelnuovo Via Zambellini - 26013 Crema', false),
  ('2615A28', 'csi-lodi-crema-open-m-gir-2026-2027', 'andata', 5, DATE '2026-11-17', TIME '21:30', 'izanese', 'spartak', 'Palestra Comunale Viale Europa, 2 - 26010 Izano Cr', false),
  ('2615A29', 'csi-lodi-crema-open-m-gir-2026-2027', 'andata', 5, DATE '2026-11-19', TIME '21:30', 'dispettosi', 'don-milani', 'Palestra Comunale Via Dell''Incastrone - 26010 Casaletto Ceredano Cr', false),
  ('2615A30', 'csi-lodi-crema-open-m-gir-2026-2027', 'andata', 5, DATE '2026-11-19', TIME '21:30', 'petrarca', 'mirmidoni', 'Palazzetto Via F. Coppi - 26812 Borghetto Lodigiano Lo', false),
  ('2615A31', 'csi-lodi-crema-open-m-gir-2026-2027', 'andata', 6, DATE '2026-11-24', TIME '22:30', 'atalantina', 'daniel', 'C.S. Enzo Saronni Via Convento 11 - 26010 Pianengo Cr', false),
  ('2615A32', 'csi-lodi-crema-open-m-gir-2026-2027', 'andata', 6, DATE '2026-11-24', TIME '22:00', 'don-milani', 'atletico-gerre', 'Palazzetto Via F. Coppi - 26812 Borghetto Lodigiano Lo', false),
  ('2615A33', 'csi-lodi-crema-open-m-gir-2026-2027', 'andata', 6, DATE '2026-11-26', TIME '20:30', 'tigers', 'izanese', 'Palestra Comunale Via Mazzini - 26858 Sordio Lo', false),
  ('2615A34', 'csi-lodi-crema-open-m-gir-2026-2027', 'andata', 6, DATE '2026-11-26', TIME '21:30', 'dispettosi', 'mirmidoni', 'Palestra Comunale Via Dell''Incastrone - 26010 Casaletto Ceredano Cr', false),
  ('2615A35', 'csi-lodi-crema-open-m-gir-2026-2027', 'andata', 6, DATE '2026-11-27', TIME '21:00', 'spartak', 'petrarca', 'Palestra Comunale Piazza Libertà - 26833 Merlino Lo', true),
  ('2615A36', 'csi-lodi-crema-open-m-gir-2026-2027', 'andata', 6, DATE '2026-11-27', TIME '22:00', 'lodifutsal', 'marescoglio', 'Palestra Com. Via per Cassino 20 - 26837 Mulazzano Lo', false),
  ('2615A37', 'csi-lodi-crema-open-m-gir-2026-2027', 'andata', 7, DATE '2026-11-30', TIME '21:00', 'atletico-gerre', 'dispettosi', 'Campo Comunale Via Roma - 26862 Guardamiglio Lo', false),
  ('2615A38', 'csi-lodi-crema-open-m-gir-2026-2027', 'andata', 7, DATE '2026-11-30', TIME '21:45', 'daniel', 'don-milani', 'Palestra Comunale Via Cassanello 1 - 26839 Zelo Buon Persico Lo', false),
  ('2615A39', 'csi-lodi-crema-open-m-gir-2026-2027', 'andata', 7, DATE '2026-12-01', TIME '21:15', 'marescoglio', 'atalantina', 'Oratorio Castelnuovo Via Zambellini - 26013 Crema', false),
  ('2615A40', 'csi-lodi-crema-open-m-gir-2026-2027', 'andata', 7, DATE '2026-12-01', TIME '21:30', 'izanese', 'lodifutsal', 'Palestra Comunale Viale Europa, 2 - 26010 Izano Cr', false),
  ('2615A41', 'csi-lodi-crema-open-m-gir-2026-2027', 'andata', 7, DATE '2026-12-03', TIME '21:30', 'petrarca', 'tigers', 'Palazzetto Via F. Coppi - 26812 Borghetto Lodigiano Lo', false),
  ('2615A42', 'csi-lodi-crema-open-m-gir-2026-2027', 'andata', 7, DATE '2026-12-03', TIME '20:30', 'mirmidoni', 'spartak', 'Palestra Comunale Piazza Libertà - 26833 Merlino Lo', false),
  ('2615A43', 'csi-lodi-crema-open-m-gir-2026-2027', 'andata', 8, DATE '2026-12-15', TIME '21:30', 'izanese', 'marescoglio', 'Palestra Comunale Viale Europa, 2 - 26010 Izano Cr', false),
  ('2615A44', 'csi-lodi-crema-open-m-gir-2026-2027', 'andata', 8, DATE '2026-12-17', TIME '21:30', 'petrarca', 'daniel', 'Palazzetto Via F. Coppi - 26812 Borghetto Lodigiano Lo', false),
  ('2615A45', 'csi-lodi-crema-open-m-gir-2026-2027', 'andata', 8, DATE '2026-12-17', TIME '20:30', 'tigers', 'dispettosi', 'Palestra Comunale Via Mazzini - 26858 Sordio Lo', false),
  ('2615A46', 'csi-lodi-crema-open-m-gir-2026-2027', 'andata', 8, DATE '2026-12-17', TIME '20:30', 'mirmidoni', 'atalantina', 'Palestra Comunale Piazza Libertà - 26833 Merlino Lo', false),
  ('2615A47', 'csi-lodi-crema-open-m-gir-2026-2027', 'andata', 8, DATE '2026-12-18', TIME '21:00', 'spartak', 'atletico-gerre', 'Palestra Comunale Piazza Libertà - 26833 Merlino Lo', true),
  ('2615A48', 'csi-lodi-crema-open-m-gir-2026-2027', 'andata', 8, DATE '2026-12-18', TIME '22:00', 'lodifutsal', 'don-milani', 'Palestra Com. Via per Cassino 20 - 26837 Mulazzano Lo', false),
  ('2615A49', 'csi-lodi-crema-open-m-gir-2026-2027', 'andata', 9, DATE '2027-01-11', TIME '21:00', 'atletico-gerre', 'petrarca', 'Campo Comunale Via Roma - 26862 Guardamiglio Lo', false),
  ('2615A50', 'csi-lodi-crema-open-m-gir-2026-2027', 'andata', 9, DATE '2027-01-11', TIME '21:45', 'daniel', 'izanese', 'Palestra Comunale Via Cassanello 1 - 26839 Zelo Buon Persico Lo', false),
  ('2615A51', 'csi-lodi-crema-open-m-gir-2026-2027', 'andata', 9, DATE '2027-01-12', TIME '22:30', 'atalantina', 'lodifutsal', 'C.S. Enzo Saronni Via Convento 11 - 26010 Pianengo Cr', false),
  ('2615A52', 'csi-lodi-crema-open-m-gir-2026-2027', 'andata', 9, DATE '2027-01-12', TIME '22:00', 'don-milani', 'tigers', 'Palazzetto Via F. Coppi - 26812 Borghetto Lodigiano Lo', false),
  ('2615A53', 'csi-lodi-crema-open-m-gir-2026-2027', 'andata', 9, DATE '2027-01-12', TIME '21:15', 'marescoglio', 'mirmidoni', 'Oratorio Castelnuovo Via Zambellini - 26013 Crema', false),
  ('2615A54', 'csi-lodi-crema-open-m-gir-2026-2027', 'andata', 9, DATE '2027-01-14', TIME '21:30', 'dispettosi', 'spartak', 'Palestra Comunale Via Dell''Incastrone - 26010 Casaletto Ceredano Cr', false),
  ('2615A55', 'csi-lodi-crema-open-m-gir-2026-2027', 'andata', 10, DATE '2027-01-19', TIME '22:30', 'atalantina', 'dispettosi', 'C.S. Enzo Saronni Via Convento 11 - 26010 Pianengo Cr', false),
  ('2615A56', 'csi-lodi-crema-open-m-gir-2026-2027', 'andata', 10, DATE '2027-01-21', TIME '21:30', 'petrarca', 'izanese', 'Palazzetto Via F. Coppi - 26812 Borghetto Lodigiano Lo', false),
  ('2615A57', 'csi-lodi-crema-open-m-gir-2026-2027', 'andata', 10, DATE '2027-01-21', TIME '20:30', 'tigers', 'daniel', 'Palestra Comunale Via Mazzini - 26858 Sordio Lo', false),
  ('2615A58', 'csi-lodi-crema-open-m-gir-2026-2027', 'andata', 10, DATE '2027-01-21', TIME '20:30', 'mirmidoni', 'don-milani', 'Palestra Comunale Piazza Libertà - 26833 Merlino Lo', false),
  ('2615A59', 'csi-lodi-crema-open-m-gir-2026-2027', 'andata', 10, DATE '2027-01-22', TIME '21:00', 'spartak', 'marescoglio', 'Palestra Comunale Piazza Libertà - 26833 Merlino Lo', true),
  ('2615A60', 'csi-lodi-crema-open-m-gir-2026-2027', 'andata', 10, DATE '2027-01-22', TIME '22:00', 'lodifutsal', 'atletico-gerre', 'Palestra Com. Via per Cassino 20 - 26837 Mulazzano Lo', false),
  ('2615A61', 'csi-lodi-crema-open-m-gir-2026-2027', 'andata', 11, DATE '2027-01-25', TIME '21:00', 'atletico-gerre', 'marescoglio', 'Campo Comunale Via Roma - 26862 Guardamiglio Lo', false),
  ('2615A62', 'csi-lodi-crema-open-m-gir-2026-2027', 'andata', 11, DATE '2027-01-25', TIME '21:45', 'daniel', 'mirmidoni', 'Palestra Comunale Via Cassanello 1 - 26839 Zelo Buon Persico Lo', false),
  ('2615A63', 'csi-lodi-crema-open-m-gir-2026-2027', 'andata', 11, DATE '2027-01-26', TIME '22:30', 'atalantina', 'spartak', 'C.S. Enzo Saronni Via Convento 11 - 26010 Pianengo Cr', false),
  ('2615A64', 'csi-lodi-crema-open-m-gir-2026-2027', 'andata', 11, DATE '2027-01-26', TIME '22:00', 'don-milani', 'petrarca', 'Palazzetto Via F. Coppi - 26812 Borghetto Lodigiano Lo', false),
  ('2615A65', 'csi-lodi-crema-open-m-gir-2026-2027', 'andata', 11, DATE '2027-01-28', TIME '21:30', 'dispettosi', 'izanese', 'Palestra Comunale Via Dell''Incastrone - 26010 Casaletto Ceredano Cr', false),
  ('2615A66', 'csi-lodi-crema-open-m-gir-2026-2027', 'andata', 11, DATE '2027-01-29', TIME '22:00', 'lodifutsal', 'tigers', 'Palestra Com. Via per Cassino 20 - 26837 Mulazzano Lo', false),
  ('2615R67', 'csi-lodi-crema-open-m-gir-2026-2027', 'ritorno', 1, DATE '2027-02-02', TIME '21:30', 'izanese', 'daniel', 'Palestra Comunale Viale Europa, 2 - 26010 Izano Cr', false),
  ('2615R68', 'csi-lodi-crema-open-m-gir-2026-2027', 'ritorno', 1, DATE '2027-02-04', TIME '20:30', 'tigers', 'don-milani', 'Palestra Comunale Via Mazzini - 26858 Sordio Lo', false),
  ('2615R69', 'csi-lodi-crema-open-m-gir-2026-2027', 'ritorno', 1, DATE '2027-02-04', TIME '21:30', 'petrarca', 'atletico-gerre', 'Palazzetto Via F. Coppi - 26812 Borghetto Lodigiano Lo', false),
  ('2615R70', 'csi-lodi-crema-open-m-gir-2026-2027', 'ritorno', 1, DATE '2027-02-04', TIME '20:30', 'mirmidoni', 'marescoglio', 'Palestra Comunale Piazza Libertà - 26833 Merlino Lo', false),
  ('2615R71', 'csi-lodi-crema-open-m-gir-2026-2027', 'ritorno', 1, DATE '2027-02-05', TIME '22:00', 'lodifutsal', 'atalantina', 'Palestra Com. Via per Cassino 20 - 26837 Mulazzano Lo', false),
  ('2615R72', 'csi-lodi-crema-open-m-gir-2026-2027', 'ritorno', 1, DATE '2027-02-05', TIME '21:00', 'spartak', 'dispettosi', 'Palestra Comunale Piazza Libertà - 26833 Merlino Lo', true),
  ('2615R73', 'csi-lodi-crema-open-m-gir-2026-2027', 'ritorno', 2, DATE '2027-02-08', TIME '21:45', 'daniel', 'marescoglio', 'Palestra Comunale Via Cassanello 1 - 26839 Zelo Buon Persico Lo', false),
  ('2615R74', 'csi-lodi-crema-open-m-gir-2026-2027', 'ritorno', 2, DATE '2027-02-09', TIME '21:30', 'izanese', 'atletico-gerre', 'Palestra Comunale Viale Europa, 2 - 26010 Izano Cr', true),
  ('2615R75', 'csi-lodi-crema-open-m-gir-2026-2027', 'ritorno', 2, DATE '2027-02-12', TIME '21:00', 'spartak', 'don-milani', 'Palestra Comunale Piazza Libertà - 26833 Merlino Lo', true),
  ('2615R76', 'csi-lodi-crema-open-m-gir-2026-2027', 'ritorno', 2, DATE '2027-02-09', TIME '22:30', 'atalantina', 'tigers', 'C.S. Enzo Saronni Via Convento 11 - 26010 Pianengo Cr', false),
  ('2615R77', 'csi-lodi-crema-open-m-gir-2026-2027', 'ritorno', 2, DATE '2027-02-11', TIME '21:30', 'dispettosi', 'petrarca', 'Palestra Comunale Via Dell''Incastrone - 26010 Casaletto Ceredano Cr', false),
  ('2615R78', 'csi-lodi-crema-open-m-gir-2026-2027', 'ritorno', 2, DATE '2027-02-12', TIME '22:00', 'lodifutsal', 'mirmidoni', 'Palestra Com. Via per Cassino 20 - 26837 Mulazzano Lo', false),
  ('2615R79', 'csi-lodi-crema-open-m-gir-2026-2027', 'ritorno', 3, DATE '2027-02-15', TIME '21:45', 'daniel', 'dispettosi', 'Palestra Comunale Via Cassanello 1 - 26839 Zelo Buon Persico Lo', false),
  ('2615R80', 'csi-lodi-crema-open-m-gir-2026-2027', 'ritorno', 3, DATE '2027-02-16', TIME '21:30', 'izanese', 'atalantina', 'Palestra Comunale Viale Europa, 2 - 26010 Izano Cr', false),
  ('2615R81', 'csi-lodi-crema-open-m-gir-2026-2027', 'ritorno', 3, DATE '2027-02-16', TIME '21:15', 'marescoglio', 'don-milani', 'Oratorio Castelnuovo Via Zambellini - 26013 Crema', false),
  ('2615R82', 'csi-lodi-crema-open-m-gir-2026-2027', 'ritorno', 3, DATE '2027-02-18', TIME '21:30', 'petrarca', 'lodifutsal', 'Palazzetto Via F. Coppi - 26812 Borghetto Lodigiano Lo', false),
  ('2615R83', 'csi-lodi-crema-open-m-gir-2026-2027', 'ritorno', 3, DATE '2027-02-18', TIME '20:30', 'mirmidoni', 'atletico-gerre', 'Palestra Comunale Piazza Libertà - 26833 Merlino Lo', false),
  ('2615R84', 'csi-lodi-crema-open-m-gir-2026-2027', 'ritorno', 3, DATE '2027-02-19', TIME '21:00', 'spartak', 'tigers', 'Palestra Comunale Piazza Libertà - 26833 Merlino Lo', true),
  ('2615R85', 'csi-lodi-crema-open-m-gir-2026-2027', 'ritorno', 4, DATE '2027-02-22', TIME '21:00', 'atletico-gerre', 'daniel', 'Campo Comunale Via Roma - 26862 Guardamiglio Lo', false),
  ('2615R86', 'csi-lodi-crema-open-m-gir-2026-2027', 'ritorno', 4, DATE '2027-02-23', TIME '22:00', 'don-milani', 'izanese', 'Palazzetto Via F. Coppi - 26812 Borghetto Lodigiano Lo', false),
  ('2615R87', 'csi-lodi-crema-open-m-gir-2026-2027', 'ritorno', 4, DATE '2027-02-23', TIME '22:30', 'atalantina', 'petrarca', 'C.S. Enzo Saronni Via Convento 11 - 26010 Pianengo Cr', false),
  ('2615R88', 'csi-lodi-crema-open-m-gir-2026-2027', 'ritorno', 4, DATE '2027-02-25', TIME '21:30', 'dispettosi', 'marescoglio', 'Palestra Comunale Via Dell''Incastrone - 26010 Casaletto Ceredano Cr', false),
  ('2615R89', 'csi-lodi-crema-open-m-gir-2026-2027', 'ritorno', 4, DATE '2027-02-25', TIME '20:30', 'tigers', 'mirmidoni', 'Palestra Comunale Via Mazzini - 26858 Sordio Lo', false),
  ('2615R90', 'csi-lodi-crema-open-m-gir-2026-2027', 'ritorno', 4, DATE '2027-02-26', TIME '22:00', 'lodifutsal', 'spartak', 'Palestra Com. Via per Cassino 20 - 26837 Mulazzano Lo', false),
  ('2615R91', 'csi-lodi-crema-open-m-gir-2026-2027', 'ritorno', 5, DATE '2027-03-02', TIME '21:30', 'izanese', 'dispettosi', 'Palestra Comunale Viale Europa, 2 - 26010 Izano Cr', false),
  ('2615R92', 'csi-lodi-crema-open-m-gir-2026-2027', 'ritorno', 5, DATE '2027-03-02', TIME '21:15', 'marescoglio', 'atletico-gerre', 'Oratorio Castelnuovo Via Zambellini - 26013 Crema', false),
  ('2615R93', 'csi-lodi-crema-open-m-gir-2026-2027', 'ritorno', 5, DATE '2027-03-04', TIME '20:30', 'tigers', 'lodifutsal', 'Palestra Comunale Via Mazzini - 26858 Sordio Lo', false),
  ('2615R94', 'csi-lodi-crema-open-m-gir-2026-2027', 'ritorno', 5, DATE '2027-03-04', TIME '21:30', 'petrarca', 'don-milani', 'Palazzetto Via F. Coppi - 26812 Borghetto Lodigiano Lo', false),
  ('2615R95', 'csi-lodi-crema-open-m-gir-2026-2027', 'ritorno', 5, DATE '2027-03-04', TIME '20:30', 'mirmidoni', 'daniel', 'Palestra Comunale Piazza Libertà - 26833 Merlino Lo', false),
  ('2615R96', 'csi-lodi-crema-open-m-gir-2026-2027', 'ritorno', 5, DATE '2027-03-05', TIME '21:00', 'spartak', 'atalantina', 'Palestra Comunale Piazza Libertà - 26833 Merlino Lo', true),
  ('2615R100', 'csi-lodi-crema-open-m-gir-2026-2027', 'ritorno', 6, DATE '2027-03-11', TIME '20:30', 'tigers', 'petrarca', 'Palestra Comunale Via Mazzini - 26858 Sordio Lo', false),
  ('2615R101', 'csi-lodi-crema-open-m-gir-2026-2027', 'ritorno', 6, DATE '2027-03-12', TIME '22:00', 'lodifutsal', 'izanese', 'Palestra Com. Via per Cassino 20 - 26837 Mulazzano Lo', false),
  ('2615R102', 'csi-lodi-crema-open-m-gir-2026-2027', 'ritorno', 6, DATE '2027-03-12', TIME '21:00', 'spartak', 'mirmidoni', 'Palestra Comunale Piazza Libertà - 26833 Merlino Lo', true),
  ('2615R97', 'csi-lodi-crema-open-m-gir-2026-2027', 'ritorno', 6, DATE '2027-03-09', TIME '22:00', 'don-milani', 'daniel', 'Palazzetto Via F. Coppi - 26812 Borghetto Lodigiano Lo', false),
  ('2615R98', 'csi-lodi-crema-open-m-gir-2026-2027', 'ritorno', 6, DATE '2027-03-09', TIME '22:30', 'atalantina', 'marescoglio', 'C.S. Enzo Saronni Via Convento 11 - 26010 Pianengo Cr', false),
  ('2615R99', 'csi-lodi-crema-open-m-gir-2026-2027', 'ritorno', 6, DATE '2027-03-11', TIME '21:30', 'dispettosi', 'atletico-gerre', 'Palestra Comunale Via Dell''Incastrone - 26010 Casaletto Ceredano Cr', false),
  ('2615R103', 'csi-lodi-crema-open-m-gir-2026-2027', 'ritorno', 7, DATE '2027-03-15', TIME '21:45', 'daniel', 'atalantina', 'Palestra Comunale Via Cassanello 1 - 26839 Zelo Buon Persico Lo', false),
  ('2615R104', 'csi-lodi-crema-open-m-gir-2026-2027', 'ritorno', 7, DATE '2027-03-15', TIME '21:00', 'atletico-gerre', 'don-milani', 'Campo Comunale Via Roma - 26862 Guardamiglio Lo', false),
  ('2615R105', 'csi-lodi-crema-open-m-gir-2026-2027', 'ritorno', 7, DATE '2027-03-16', TIME '21:30', 'izanese', 'tigers', 'Palestra Comunale Viale Europa, 2 - 26010 Izano Cr', false),
  ('2615R106', 'csi-lodi-crema-open-m-gir-2026-2027', 'ritorno', 7, DATE '2027-03-16', TIME '21:15', 'marescoglio', 'lodifutsal', 'Oratorio Castelnuovo Via Zambellini - 26013 Crema', false),
  ('2615R107', 'csi-lodi-crema-open-m-gir-2026-2027', 'ritorno', 7, DATE '2027-03-18', TIME '21:30', 'petrarca', 'spartak', 'Palazzetto Via F. Coppi - 26812 Borghetto Lodigiano Lo', false),
  ('2615R108', 'csi-lodi-crema-open-m-gir-2026-2027', 'ritorno', 7, DATE '2027-03-18', TIME '20:30', 'mirmidoni', 'dispettosi', 'Palestra Comunale Piazza Libertà - 26833 Merlino Lo', false),
  ('2615R109', 'csi-lodi-crema-open-m-gir-2026-2027', 'ritorno', 8, DATE '2027-03-22', TIME '21:45', 'daniel', 'petrarca', 'Palestra Comunale Via Cassanello 1 - 26839 Zelo Buon Persico Lo', true),
  ('2615R110', 'csi-lodi-crema-open-m-gir-2026-2027', 'ritorno', 8, DATE '2027-03-22', TIME '21:00', 'atletico-gerre', 'spartak', 'Campo Comunale Via Roma - 26862 Guardamiglio Lo', true),
  ('2615R111', 'csi-lodi-crema-open-m-gir-2026-2027', 'ritorno', 8, DATE '2027-03-23', TIME '21:15', 'marescoglio', 'izanese', 'Oratorio Castelnuovo Via Zambellini - 26013 Crema', true),
  ('2615R112', 'csi-lodi-crema-open-m-gir-2026-2027', 'ritorno', 8, DATE '2027-03-23', TIME '22:00', 'don-milani', 'lodifutsal', 'Palazzetto Via F. Coppi - 26812 Borghetto Lodigiano Lo', true),
  ('2615R113', 'csi-lodi-crema-open-m-gir-2026-2027', 'ritorno', 8, DATE '2027-03-23', TIME '22:30', 'atalantina', 'mirmidoni', 'C.S. Enzo Saronni Via Convento 11 - 26010 Pianengo Cr', true),
  ('2615R114', 'csi-lodi-crema-open-m-gir-2026-2027', 'ritorno', 8, DATE '2027-04-01', TIME '21:30', 'dispettosi', 'tigers', 'Palestra Comunale Via Dell''Incastrone - 26010 Casaletto Ceredano Cr', true),
  ('2615R115', 'csi-lodi-crema-open-m-gir-2026-2027', 'ritorno', 9, DATE '2027-04-06', TIME '22:30', 'atalantina', 'don-milani', 'C.S. Enzo Saronni Via Convento 11 - 26010 Pianengo Cr', true),
  ('2615R116', 'csi-lodi-crema-open-m-gir-2026-2027', 'ritorno', 9, DATE '2027-04-08', TIME '20:30', 'tigers', 'atletico-gerre', 'Palestra Comunale Via Mazzini - 26858 Sordio Lo', true),
  ('2615R117', 'csi-lodi-crema-open-m-gir-2026-2027', 'ritorno', 9, DATE '2027-04-08', TIME '21:30', 'petrarca', 'marescoglio', 'Palazzetto Via F. Coppi - 26812 Borghetto Lodigiano Lo', true),
  ('2615R118', 'csi-lodi-crema-open-m-gir-2026-2027', 'ritorno', 9, DATE '2027-04-08', TIME '20:30', 'mirmidoni', 'izanese', 'Palestra Comunale Piazza Libertà - 26833 Merlino Lo', true),
  ('2615R119', 'csi-lodi-crema-open-m-gir-2026-2027', 'ritorno', 9, DATE '2027-04-09', TIME '22:00', 'lodifutsal', 'dispettosi', 'Palestra Com. Via per Cassino 20 - 26837 Mulazzano Lo', true),
  ('2615R120', 'csi-lodi-crema-open-m-gir-2026-2027', 'ritorno', 9, DATE '2027-04-05', TIME '21:45', 'daniel', 'spartak', 'Palestra Comunale Via Cassanello 1 - 26839 Zelo Buon Persico Lo', true),
  ('2615R121', 'csi-lodi-crema-open-m-gir-2026-2027', 'ritorno', 10, DATE '2027-04-12', TIME '21:45', 'daniel', 'tigers', 'Palestra Comunale Via Cassanello 1 - 26839 Zelo Buon Persico Lo', true),
  ('2615R122', 'csi-lodi-crema-open-m-gir-2026-2027', 'ritorno', 10, DATE '2027-04-12', TIME '21:00', 'atletico-gerre', 'lodifutsal', 'Campo Comunale Via Roma - 26862 Guardamiglio Lo', true),
  ('2615R123', 'csi-lodi-crema-open-m-gir-2026-2027', 'ritorno', 10, DATE '2027-04-13', TIME '21:30', 'izanese', 'petrarca', 'Palestra Comunale Viale Europa, 2 - 26010 Izano Cr', true),
  ('2615R124', 'csi-lodi-crema-open-m-gir-2026-2027', 'ritorno', 10, DATE '2027-04-13', TIME '21:15', 'marescoglio', 'spartak', 'Oratorio Castelnuovo Via Zambellini - 26013 Crema', true),
  ('2615R125', 'csi-lodi-crema-open-m-gir-2026-2027', 'ritorno', 10, DATE '2027-04-13', TIME '22:00', 'don-milani', 'mirmidoni', 'Palazzetto Via F. Coppi - 26812 Borghetto Lodigiano Lo', true),
  ('2615R126', 'csi-lodi-crema-open-m-gir-2026-2027', 'ritorno', 10, DATE '2027-04-15', TIME '21:30', 'dispettosi', 'atalantina', 'Palestra Comunale Via Dell''Incastrone - 26010 Casaletto Ceredano Cr', true),
  ('2615R127', 'csi-lodi-crema-open-m-gir-2026-2027', 'ritorno', 11, DATE '2027-04-20', TIME '22:00', 'don-milani', 'dispettosi', 'Palazzetto Via F. Coppi - 26812 Borghetto Lodigiano Lo', true),
  ('2615R128', 'csi-lodi-crema-open-m-gir-2026-2027', 'ritorno', 11, DATE '2027-04-20', TIME '22:30', 'atalantina', 'atletico-gerre', 'C.S. Enzo Saronni Via Convento 11 - 26010 Pianengo Cr', true),
  ('2615R129', 'csi-lodi-crema-open-m-gir-2026-2027', 'ritorno', 11, DATE '2027-04-22', TIME '20:30', 'tigers', 'marescoglio', 'Palestra Comunale Via Mazzini - 26858 Sordio Lo', true),
  ('2615R130', 'csi-lodi-crema-open-m-gir-2026-2027', 'ritorno', 11, DATE '2027-04-22', TIME '20:30', 'mirmidoni', 'petrarca', 'Palestra Comunale Piazza Libertà - 26833 Merlino Lo', true),
  ('2615R131', 'csi-lodi-crema-open-m-gir-2026-2027', 'ritorno', 11, DATE '2027-04-23', TIME '22:00', 'lodifutsal', 'daniel', 'Palestra Com. Via per Cassino 20 - 26837 Mulazzano Lo', true),
  ('2615R132', 'csi-lodi-crema-open-m-gir-2026-2027', 'ritorno', 11, DATE '2027-04-23', TIME '21:00', 'spartak', 'izanese', 'Palestra Comunale Piazza Libertà - 26833 Merlino Lo', true);

COMMIT;

-- RISULTATI: esempi commentati, NON sono punteggi reali.
-- Eseguire separatamente dopo aver sostituito i gol con quelli effettivi.
-- L'ID e' il codice gara originale, visibile nel calendario.
-- Per inserire o correggere un risultato:
--
-- INSERT INTO campioneto.results (match_id, home_goals, away_goals)
-- VALUES ('2615A1', 3, 1)
-- ON CONFLICT (match_id) DO UPDATE
-- SET home_goals = EXCLUDED.home_goals, away_goals = EXCLUDED.away_goals;
--
-- Per registrare un pareggio a reti inviolate:
--
-- INSERT INTO campioneto.results (match_id, home_goals, away_goals)
-- VALUES ('2615A2', 0, 0)
-- ON CONFLICT (match_id) DO UPDATE
-- SET home_goals = EXCLUDED.home_goals, away_goals = EXCLUDED.away_goals;
--
-- Per annullare un risultato (la partita torna senza risultato):
-- DELETE FROM campioneto.results WHERE match_id = '2615A1';
--
-- Lettura calendario e risultati, incluse le gare ancora da giocare:
-- SELECT m.*, h.name AS home_team, a.name AS away_team,
--        r.home_goals, r.away_goals
-- FROM campioneto.matches AS m
-- JOIN campioneto.teams AS h ON h.id = m.home_team_id
-- JOIN campioneto.teams AS a ON a.id = m.away_team_id
-- LEFT JOIN campioneto.results AS r ON r.match_id = m.id
-- WHERE m.championship_id = 'csi-lodi-crema-open-m-gir-2026-2027'
-- ORDER BY CASE m.leg WHEN 'andata' THEN 0 ELSE 1 END,
--          m.matchday, m.match_date, m.match_time, m.id;
--
-- La classifica non e' salvata in una tabella: si ricava dai risultati.
-- Per un futuro collegamento pubblico servira' un'API o altro servizio sicuro:
-- non inserire credenziali PostgreSQL nel codice Angular distribuito.
