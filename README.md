# Campioneto

Angular 21 per il campionato CSI Lodi/Crema di calcio a 5, Open M / GIR,
stagione 2026/2027. Calendario, squadre, giornate e risultati provengono da
**Neon PostgreSQL**, tramite una funzione serverless **Netlify** di sola lettura.
La classifica viene calcolata nel browser con le regole concordate.

## Collegamento Neon e pubblicazione Netlify

1. Su Neon deve esistere lo schema `campioneto`, inizializzato tramite
   `database/campioneto.postgresql.sql`. Non rieseguire lo script se lo schema
   e' gia' stato creato: e' uno script di prima inizializzazione.
2. Nel pannello **Connect** di Neon selezionare il branch, database e ruolo
   corretti e copiare la connection string PostgreSQL, con SSL (`sslmode=require`).
   E' possibile usare la connessione pooled.
3. In Netlify, nelle variabili d'ambiente del progetto, impostare
   **`DATABASE_URL`** con quella stringa, come secret disponibile alle **Functions**
   nel contesto di deploy desiderato (Production e/o Deploy Previews).
   Non inserirla nel repository, nel bundle Angular, in file pubblici o in chat.
4. Collegare il repository a Netlify e avviare un deploy. `netlify.toml` imposta
   Node 24, build `npm run build`, pubblicazione `dist/campioneto/browser` e
   funzioni in `netlify/functions`. Serve un deploy completo del progetto:
   caricare soltanto la cartella `dist` non pubblica l'API.
5. Aprire `/api/championship` sul dominio Netlify: deve rispondere con JSON
   contenente `teams`, `rounds`, `matches` e `results`. Una variabile aggiunta o
   modificata richiede un nuovo deploy delle funzioni.

Non servono chiavi API Neon o credenziali nel frontend. L'ID del campionato
letto dall'API e' `csi-lodi-crema-open-m-gir-2026-2027`.
Non e' possibile verificare la connessione al proprio database finche'
`DATABASE_URL` non e' configurata nell'ambiente di esecuzione.

**Ruolo consigliato:** usare una connection string con un ruolo PostgreSQL
dedicato di sola lettura, non il proprietario delle tabelle. Un amministratore
puo' attribuire i permessi a un ruolo gia' creato, sostituendo `campioneto_reader`:

```sql
GRANT USAGE ON SCHEMA campioneto TO campioneto_reader;
GRANT SELECT ON campioneto.championships, campioneto.teams,
  campioneto.championship_teams, campioneto.matchdays,
  campioneto.matches, campioneto.results TO campioneto_reader;
```

L'endpoint e' pubblico come il calendario, accetta solo GET e non consente
scritture. Per aggiungere risultati si continua a usare l'editor SQL di Neon
con un ruolo autorizzato, separato dalle credenziali di lettura dell'app.
Non vengono esposti password, connection string o dettagli degli errori del driver.

## Sviluppo locale

Usare **Node.js 24 LTS** (vedi `.nvmrc`) e npm. Node 26 non e' supportato
ufficialmente da Angular 21.

```sh
npm install
```

Copiare `.env.example` in `.env` nella directory principale e sostituire
il valore di esempio di `DATABASE_URL` con la propria connection string Neon.
Il file `.env` e' escluso da Git.

```sh
npm run dev:netlify
```

Aprire `http://localhost:8888/`: Netlify Dev avvia Angular sulla porta 4200
e gestisce l'API e i redirect sulla porta 8888. Usare la porta **8888** per
provare l'app con il database; `npm start` da solo avvia soltanto il frontend,
senza funzione e senza accesso ai dati. La CLI Netlify puo' richiedere
l'autenticazione e il collegamento al progetto Netlify.

## Aggiornamento dei risultati

I risultati si modificano **nel database**, non nei file Angular:

```sql
-- Esempio: sostituire con il punteggio reale prima di eseguire.
INSERT INTO campioneto.results (match_id, home_goals, away_goals)
VALUES ('2615A1', 3, 1)
ON CONFLICT (match_id) DO UPDATE
SET home_goals = EXCLUDED.home_goals,
    away_goals = EXCLUDED.away_goals;
```

Usare gli ID originali delle gare presenti in `campioneto.matches`.
Inserire solo gare concluse: l'assenza di una riga indica un risultato
non pubblicato; `0, 0` indica un pareggio a reti inviolate.
Per annullare un risultato:

```sql
DELETE FROM campioneto.results WHERE match_id = '2615A1';
```

Dopo un aggiornamento SQL basta **ricaricare la pagina**, senza ricompilare
o ripubblicare il sito. L'API non usa cache. Non e' previsto un aggiornamento
automatico in tempo reale delle pagine gia' aperte.
In caso di errore l'app mostra un messaggio e il pulsante Riprova, senza
sostituire i dati del database con un calendario statico o una classifica a zero.

## Calendario originale e regole

Lo script SQL contiene 12 squadre, 22 giornate e 132 incontri dal PDF
`Calendario_137_CAC_Open_M_GIR-20261014_0949.pdf` (14/10/2026, 09:49).
Il ritorno conserva l'ordine originale, diverso dall'andata. I file
`src/app/data/calendar.json` e `results.ts` restano solo come riferimento
storico/fixture dei test: **non sono importati dall'app a runtime**.

- Vittoria: 3 punti; pareggio: 1; sconfitta: 0.
- A pari punti: punti negli scontri diretti fra tutte le squadre del gruppo
  (mini-classifica), poi differenza reti generale, poi gol fatti generali.
- Sono considerati solo gli scontri diretti con risultato pubblicato, anche
  se non sono ancora stati giocati tutti gli incontri fra le squadre a pari punti.
- Ulteriore parita': posizione condivisa (1, 1, 3), ordine alfabetico solo
  per visualizzazione. Nessuna penalizzazione automatica.

## Interfaccia e struttura

Giornate prima della classifica, senza intestazioni introduttive.
Calendario a schede, tabella scorrevole sui dispositivi piccoli e indirizzi
cliccabili che aprono Google Maps in una nuova scheda.
Le giornate disponibili e i limiti di navigazione sono ricavati dal database.

- `netlify/functions/championship.mjs`: lettura Neon e risposta `/api/championship`.
- `netlify.toml`: build, sviluppo locale, funzioni e redirect.
- `src/app/championship-data.ts`: validazione dei dati ricevuti dall'API.
- `src/app/championship.ts`: calcolo della classifica.
- `src/app/app.ts`, `app.html`, `app.scss`: caricamento e interfaccia.

## Verifiche

```sh
npm test -- --watch=false
npm run test:api
npm run build
```

I test Angular usano risposte HTTP simulate, quelli dell'API un accesso
database simulato: non modificano il database Neon e non richiedono segreti.
La build e' generata in `dist/campioneto/browser`.
