import {
  ChangeDetectorRef,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { map, timeout } from 'rxjs';
import { calculateStandings, indexResults } from './championship';
import { ChampionshipData, parseChampionship } from './championship-data';
import { MatchResult } from './championship';

interface ResultEditor {
  homeGoals: string;
  awayGoals: string;
  saving: boolean;
  error: string;
  saved: boolean;
}

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
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('resultDialog');
  private readonly changeDetector = inject(ChangeDetectorRef);
  protected readonly editingMatch = signal<string | null>(null);
  protected readonly activeMatch = computed(
    () => this.data()?.matches.find((match) => match.id === this.editingMatch()) ?? null,
  );
  protected readonly loading = signal(false);
  protected readonly error = signal('');
  protected readonly selectedRound = signal(1);
  protected readonly editors = signal<Record<string, ResultEditor>>({});
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
          this.editors.set({});
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

  protected editGoals(matchId: string, side: 'homeGoals' | 'awayGoals', value: string): void {
    const editor = this.editor(matchId);
    if (editor.saving) return;
    this.editors.update((editors) => ({
      ...editors,
      [matchId]: { ...editor, [side]: value, error: '', saved: false },
    }));
  }

  protected openEditor(matchId: string): void {
    this.editingMatch.set(matchId);
    this.changeDetector.detectChanges();
    this.dialog().nativeElement.showModal();
  }

  protected closeEditor(): void {
    const matchId = this.editingMatch();
    if (matchId && this.editor(matchId).saving) return;
    this.dialog().nativeElement.close();
    this.editingMatch.set(null);
  }

  protected cancelEditor(event: Event): void {
    event.preventDefault();
    this.closeEditor();
  }

  protected editor(matchId: string): ResultEditor {
    const existing = this.editors()[matchId];
    if (existing) return existing;
    const result = this.view()?.results.get(matchId);
    return {
      homeGoals: result ? String(result.homeGoals) : '',
      awayGoals: result ? String(result.awayGoals) : '',
      saving: false,
      error: '',
      saved: false,
    };
  }

  protected saveResult(matchId: string): void {
    const editor = this.editor(matchId);
    if (editor.saving) return;
    const valid = (value: string) =>
      /^\d+$/.test(value) && Number.isSafeInteger(Number(value)) && Number(value) <= 2147483647;
    if (!valid(editor.homeGoals) || !valid(editor.awayGoals)) {
      this.editors.update((editors) => ({
        ...editors,
        [matchId]: {
          ...editor,
          error: 'Inserisci entrambi i gol: interi da 0 a 2147483647.',
          saved: false,
        },
      }));
      return;
    }
    const result: MatchResult = {
      matchId,
      homeGoals: Number(editor.homeGoals),
      awayGoals: Number(editor.awayGoals),
    };
    this.editors.update((editors) => ({
      ...editors,
      [matchId]: { ...editor, saving: true, error: '', saved: false },
    }));
    this.http
      .put<unknown>('/api/results', result)
      .pipe(
        timeout(20000),
        map((response) => {
          if (
            typeof response !== 'object' ||
            response === null ||
            !('matchId' in response) ||
            response.matchId !== result.matchId ||
            !('homeGoals' in response) ||
            response.homeGoals !== result.homeGoals ||
            !('awayGoals' in response) ||
            response.awayGoals !== result.awayGoals
          ) {
            throw new Error('Risposta di salvataggio non valida.');
          }
          return result;
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (saved) => {
          this.data.update((data) =>
            data
              ? {
                  ...data,
                  results: [...data.results.filter((item) => item.matchId !== matchId), saved],
                }
              : data,
          );
          this.editors.update((editors) => ({
            ...editors,
            [matchId]: {
              homeGoals: String(saved.homeGoals),
              awayGoals: String(saved.awayGoals),
              saving: false,
              error: '',
              saved: true,
            },
          }));
          this.closeEditor();
        },
        error: () => {
          this.editors.update((editors) => ({
            ...editors,
            [matchId]: {
              ...editor,
              saving: false,
              saved: false,
              error:
                'Salvataggio non confermato. Riprova o ricarica la pagina per verificare il risultato.',
            },
          }));
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
