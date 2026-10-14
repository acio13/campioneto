import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { App } from './app';
import calendar from './data/calendar.json';

function payload() {
  return {
    ...calendar,
    id: 'csi-lodi-crema-open-m-gir-2026-2027',
    timeZone: 'Europe/Rome',
    rounds: Array.from({ length: 22 }, (_, index) => ({
      leg: index < 11 ? 'andata' : 'ritorno',
      matchday: (index % 11) + 1,
    })),
    results: [],
  };
}

describe('App', () => {
  let http: HttpTestingController;

  beforeEach(async () => {
    Object.defineProperties(HTMLDialogElement.prototype, {
      showModal: {
        configurable: true,
        value() {
          this.setAttribute('open', '');
        },
      },
      close: {
        configurable: true,
        value() {
          this.removeAttribute('open');
        },
      },
    });
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  async function render(data = payload()) {
    const fixture = TestBed.createComponent(App);
    http.expectOne('/api/championship').flush(data);
    await fixture.whenStable();
    return { fixture, element: fixture.nativeElement as HTMLElement };
  }

  it('loads the database data and renders rounds before standings without headings', async () => {
    const { element } = await render();
    expect(element.querySelector('header, nav, h1, h2, footer')).toBeNull();
    expect([...element.querySelectorAll('main > section')].map((section) => section.id)).toEqual([
      'calendario',
      'classifica',
    ]);
    expect(element.querySelector('#calendario')?.firstElementChild?.className).toBe('filters');
    expect(element.querySelectorAll('tbody tr')).toHaveLength(12);
    expect(element.querySelectorAll('.match')).toHaveLength(6);
    expect(element.querySelectorAll('.pending')).toHaveLength(6);
  });

  it('does not display static data while loading or when the API fails, and allows retry', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('[role="status"]')?.textContent).toContain('Caricamento');
    expect(element.querySelector('table')).toBeNull();
    http.expectOne('/api/championship').flush(
      { error: 'Unavailable' },
      {
        status: 503,
        statusText: 'Service Unavailable',
      },
    );
    await fixture.whenStable();
    expect(element.querySelector('[role="alert"]')?.textContent).toContain('Impossibile caricare');
    expect(element.querySelector('.match')).toBeNull();
    element.querySelector('button')!.click();
    http.expectOne('/api/championship').flush(payload());
    await fixture.whenStable();
    expect(element.querySelector('[role="alert"]')).toBeNull();
    expect(element.querySelectorAll('.match')).toHaveLength(6);
  });

  it('rejects malformed API responses instead of calculating a misleading table', async () => {
    const fixture = TestBed.createComponent(App);
    http.expectOne('/api/championship').flush({ results: [] });
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('[role="alert"]')).not.toBeNull();
    expect(element.querySelector('table')).toBeNull();
  });

  it('uses database scores including 0-0 and recalculates the full standings', async () => {
    const data = {
      ...payload(),
      results: [
        { matchId: '2615A1', homeGoals: 4, awayGoals: 2 },
        { matchId: '2615A2', homeGoals: 0, awayGoals: 0 },
      ],
    };
    const fixture = TestBed.createComponent(App);
    http.expectOne('/api/championship').flush(data);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelectorAll('.pending')).toHaveLength(4);
    expect(element.querySelectorAll('tbody tr')[0].textContent).toContain('Atletico Gerre');
    expect(element.querySelector('tbody .points')?.textContent?.trim()).toBe('3');
    expect(element.querySelector('#calendario')?.textContent).toContain('0 - 0');
  });

  it('changes round without changing the general standings', async () => {
    const { element, fixture } = await render();
    const select = element.querySelector('select')!;
    select.value = '12';
    select.dispatchEvent(new Event('change'));
    await fixture.whenStable();
    expect(element.querySelector('.round-navigation')?.textContent).toContain(
      'Ritorno - giornata 1',
    );
    expect(element.querySelectorAll('.match')).toHaveLength(6);
    expect(element.querySelector('.match')?.textContent).toContain('02/02/2027');
    expect(element.querySelectorAll('tbody tr')).toHaveLength(12);
  });

  it('links each venue to Google Maps with the full encoded address', async () => {
    const { element } = await render();
    const links = element.querySelectorAll<HTMLAnchorElement>('.venue a');
    expect(links).toHaveLength(6);
    for (const link of links) {
      const url = new URL(link.href);
      expect(url.origin + url.pathname).toBe('https://www.google.com/maps/search/');
      expect(url.searchParams.get('api')).toBe('1');
      expect(url.searchParams.get('query')).toBe(link.textContent?.trim());
      expect(link.target).toBe('_blank');
      expect(link.rel).toBe('noopener noreferrer');
    }
  });

  it('derives available rounds and navigation limits from the database', async () => {
    const data = payload();
    data.rounds = data.rounds.slice(0, 2);
    data.matches = data.matches.filter((match) => match.leg === 'andata' && match.matchday <= 2);
    const { element, fixture } = await render(data);
    const buttons = element.querySelectorAll<HTMLButtonElement>('.round-navigation button');
    expect(buttons[0].disabled).toBe(true);
    expect(element.querySelectorAll('option')).toHaveLength(2);
    buttons[1].click();
    await fixture.whenStable();
    expect(element.querySelector('.round-navigation')?.textContent).toContain(
      'Andata - giornata 2',
    );
    expect(buttons[0].disabled).toBe(false);
    expect(buttons[1].disabled).toBe(true);
  });

  function fillScore(element: HTMLElement, home: string, away: string) {
    if (!element.querySelector('form')) {
      element.querySelector<HTMLButtonElement>('.edit-score')!.click();
    }
    const form = element.querySelector('form')!;
    const inputs = form.querySelectorAll('input');
    inputs[0].value = home;
    inputs[0].dispatchEvent(new Event('input'));
    inputs[1].value = away;
    inputs[1].dispatchEvent(new Event('input'));
    form.dispatchEvent(new Event('submit', { cancelable: true }));
    return form;
  }

  it('saves to the API and updates standings only after database confirmation', async () => {
    const { element, fixture } = await render();
    const form = fillScore(element, '4', '2');
    const save = http.expectOne('/api/results');
    expect(save.request.method).toBe('PUT');
    expect(save.request.body).toEqual({ matchId: '2615A1', homeGoals: 4, awayGoals: 2 });
    fixture.detectChanges();
    expect(form.querySelector('button')?.disabled).toBe(true);
    expect(element.querySelector('tbody .points')?.textContent?.trim()).toBe('0');
    save.flush(save.request.body);
    await fixture.whenStable();
    expect(element.querySelector('tbody .points')?.textContent?.trim()).toBe('3');
    expect(element.querySelector('.save-success')?.textContent).toContain('salvato');
    expect(element.querySelector('dialog')?.hasAttribute('open')).toBe(false);
    expect(element.querySelectorAll('.pending')).toHaveLength(5);
    fillScore(element, '0', '0');
    const correction = http.expectOne('/api/results');
    correction.flush(correction.request.body);
    await fixture.whenStable();
    expect(
      [...element.querySelectorAll('tbody .points')].filter(
        (cell) => cell.textContent?.trim() === '1',
      ),
    ).toHaveLength(2);
    expect(element.querySelectorAll('.pending')).toHaveLength(5);
  });

  it('opens only the selected match in a popup and cancels without saving', async () => {
    const { element, fixture } = await render();
    expect(element.querySelector('form')).toBeNull();
    expect(element.querySelectorAll('.edit-score')).toHaveLength(6);
    element.querySelectorAll<HTMLButtonElement>('.edit-score')[1].click();
    await fixture.whenStable();
    const dialog = element.querySelector('dialog')!;
    expect(dialog.open).toBe(true);
    expect(dialog.textContent).toContain('Marescoglio');
    expect(dialog.textContent).toContain('La Petrarca Pub');
    dialog.querySelector<HTMLButtonElement>('button[type="button"]')!.click();
    await fixture.whenStable();
    expect(dialog.open).toBe(false);
    http.expectNone('/api/results');
  });

  it('prefills existing results and keeps the popup open on invalid input or save errors', async () => {
    const fixture = TestBed.createComponent(App);
    http.expectOne('/api/championship').flush({
      ...payload(),
      results: [{ matchId: '2615A1', homeGoals: 2, awayGoals: 3 }],
    });
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    element.querySelector<HTMLButtonElement>('.edit-score')!.click();
    const inputs = element.querySelectorAll<HTMLInputElement>('dialog input');
    expect(inputs[0].value).toBe('2');
    expect(inputs[1].value).toBe('3');
    fillScore(element, '', '1');
    await fixture.whenStable();
    expect(element.querySelector('dialog')?.open).toBe(true);
    fillScore(element, '4', '1');
    const save = http.expectOne('/api/results');
    element.querySelector('dialog')!.dispatchEvent(new Event('cancel', { cancelable: true }));
    expect(element.querySelector('dialog')?.open).toBe(true);
    save.flush({}, { status: 503, statusText: 'Unavailable' });
    await fixture.whenStable();
    expect(element.querySelector('dialog')?.open).toBe(true);
    expect(element.querySelector('[role="alert"]')).not.toBeNull();
  });

  it('rejects blank or invalid scores without a request', async () => {
    const { element, fixture } = await render();
    for (const [home, away] of [
      ['', '0'],
      ['-1', '2'],
      ['1.5', '0'],
      ['2147483648', '0'],
    ]) {
      fillScore(element, home, away);
      http.expectNone('/api/results');
      await fixture.whenStable();
      expect(element.querySelector('.save-error')).not.toBeNull();
    }
  });

  it('preserves edits after failure and allows retry without duplicate submissions', async () => {
    const { element, fixture } = await render();
    const form = fillScore(element, '3', '1');
    form.dispatchEvent(new Event('submit', { cancelable: true }));
    const save = http.expectOne('/api/results');
    save.flush({}, { status: 503, statusText: 'Unavailable' });
    await fixture.whenStable();
    expect(element.querySelector('.save-error')).not.toBeNull();
    expect(form.querySelector('input')?.value).toBe('3');
    expect(element.querySelectorAll('.pending')).toHaveLength(6);
    form.dispatchEvent(new Event('submit', { cancelable: true }));
    const retry = http.expectOne('/api/results');
    retry.flush(retry.request.body);
    await fixture.whenStable();
    expect(element.querySelector('.save-error')).toBeNull();
    expect(element.querySelectorAll('.pending')).toHaveLength(5);
  });

  it('does not confirm a malformed save response or reset the selected round', async () => {
    const { element, fixture } = await render();
    const select = element.querySelector('select')!;
    select.value = '2';
    select.dispatchEvent(new Event('change'));
    await fixture.whenStable();
    fillScore(element, '2', '1');
    http.expectOne('/api/results').flush({});
    await fixture.whenStable();
    expect(element.querySelector('.save-success')).toBeNull();
    expect(element.querySelector('.save-error')).not.toBeNull();
    expect(select.value).toBe('2');
  });
});
