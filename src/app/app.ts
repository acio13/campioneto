import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { map, timeout } from 'rxjs';
import { calculateStandings, indexResults } from './championship';
import { ChampionshipData, parseChampionship } from './championship-data';

@Component({
  selector: 'app-root',
  imports: [DatePipe],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  private readonly http = inject(HttpClient);
  private readonly destroyRef = inject(DestroyRef);
  private readonly data = signal<ChampionshipData | null>(null);
  protected readonly loading = signal(false);
  protected readonly error = signal('');
  protected readonly selectedRound = signal(1);
  protected readonly view = computed(() => {
    const calendar = this.data();
    if (!calendar) return null;
    const rounds = [...calendar.rounds]
      .sort((a, b) => (a.leg === b.leg ? a.matchday - b.matchday : a.leg === 'andata' ? -1 : 1))
      .map((round, index) => ({
        ...round,
        id: index + 1,
        label: `${round.leg === 'andata' ? 'Andata' : 'Ritorno'} - giornata ${round.matchday}`,
      }));
    return {
      calendar,
      rounds,
      results: indexResults(calendar.matches, calendar.results),
      standings: calculateStandings(calendar.teams, calendar.matches, calendar.results),
      teamNames: new Map(calendar.teams.map((team) => [team.id, team.name])),
    };
  });
  protected readonly matches = computed(() => {
    const view = this.view();
    if (!view) return [];
    const round = view.rounds[this.selectedRound() - 1];
    return view.calendar.matches
      .filter((match) => match.leg === round.leg && match.matchday === round.matchday)
      .sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`));
  });
  protected readonly previousRound = (round: number) => Math.max(1, round - 1);
  protected readonly nextRound = (round: number) =>
    Math.min(this.view()?.rounds.length ?? 1, round + 1);

  constructor() {
    this.reload();
  }

  protected reload(): void {
    if (this.loading()) return;
    this.loading.set(true);
    this.error.set('');
    this.http
      .get<unknown>('/api/championship')
      .pipe(timeout(20000), map(parseChampionship), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.selectedRound.set(1);
          this.data.set(data);
          this.loading.set(false);
        },
        error: () => {
          this.data.set(null);
          this.loading.set(false);
          this.error.set(
            'Impossibile caricare il campionato. Riprova; se il problema persiste, verifica la configurazione del database.',
          );
        },
      });
  }

  protected mapsUrl(venue: string): string {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(venue)}`;
  }

  protected teamName(id: string): string {
    const name = this.view()?.teamNames.get(id);
    if (!name) throw new Error(`Squadra sconosciuta: ${id}`);
    return name;
  }
}
