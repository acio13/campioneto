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
    const buttons = element.querySelectorAll('button');
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
});
