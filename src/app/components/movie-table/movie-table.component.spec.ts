import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { FocusMonitor } from '@angular/cdk/a11y';
import { MatTooltip } from '@angular/material/tooltip';
import { By } from '@angular/platform-browser';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslocoService } from '@jsverse/transloco';
import { Movie } from '../../interfaces/movie.interface';
import { MovieActionsService } from '../../services/movie-actions.service';
import { LanguageStore } from '../../stores/language.store';
import { clearAnonymousStorage } from '../../testing/guest-storage-testing';
import {
  clearLanguagePreference,
  getTranslocoTestingModule,
  overflowingElements,
} from '../../testing/transloco-testing';
import { MovieTableComponent, MovieTableRow } from './movie-table.component';

const movie = (tmdbId: number, extra: Partial<Movie> = {}) =>
  ({
    tmdbId,
    title: `Una película con un título bastante largo ${tmdbId}`,
    overview: 'Una sinopsis larga que no cabe en dos líneas. '.repeat(6),
    posterPath: '/p.jpg',
    releaseDate: '1999-03-31',
    voteAverage: 7.46,
    voteCount: 100,
    genreIds: [],
    backdropPath: null,
    ...extra,
  }) as Movie;

describe('MovieTableComponent', () => {
  let fixture: ComponentFixture<MovieTableComponent>;
  let host: HTMLElement;
  const rows: MovieTableRow[] = [
    { key: 'a', movie: movie(1) },
    { key: 'b', movie: movie(2, { posterPath: '', releaseDate: null, overview: '' }) },
  ];

  beforeEach(async () => {
    clearAnonymousStorage();
    await TestBed.configureTestingModule({
      imports: [MovieTableComponent, getTranslocoTestingModule()],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    fixture = TestBed.createComponent(MovieTableComponent);
    fixture.componentRef.setInput('rows', rows);
    fixture.componentRef.setInput('removeLabel', 'Remove from history');
    host = fixture.nativeElement as HTMLElement;
    host.style.display = 'block';
    await fixture.whenStable();
  });

  afterEach(() => {
    clearAnonymousStorage();
    clearLanguagePreference();
    TestBed.inject(TranslocoService).setActiveLang('en');
  });

  async function atWidth(width: string) {
    host.style.width = width;
    await fixture.whenStable();
  }

  const visible = (selector: string) => {
    const element = host.querySelector(selector);
    return !!element && getComputedStyle(element).display !== 'none';
  };

  it('should show a small poster, the title, year and average', () => {
    const [first, second] = Array.from(host.querySelectorAll<HTMLImageElement>('img.thumb'));
    expect(first.src).toBe('https://image.tmdb.org/t/p/w92/p.jpg');
    expect(first.loading).toBe('lazy');
    expect(second.src).toContain('assets/images/no-poster.svg');
    expect(host.querySelector('.year')?.textContent).toBe('1999');
    expect(host.querySelector('td.average')?.textContent?.trim()).toBe('7.5');
    expect(host.querySelectorAll('.overview')[1].textContent).toContain('No synopsis available.');
  });

  it('should format the average for Spanish', async () => {
    TestBed.inject(LanguageStore).setLang('es');
    await fixture.whenStable();
    expect(host.querySelector('td.average')?.textContent?.trim()).toBe('7,5');
    expect(host.querySelector('th.mat-column-overview')?.textContent).toContain('Descripción');
  });

  it('should show every column on desktop', async () => {
    await atWidth('1200px');
    expect(visible('td.mat-column-average')).toBeTrue();
    expect(visible('td.mat-column-overview')).toBeTrue();
    expect(visible('.inline-actions')).toBeTrue();
    expect(visible('.more-actions')).toBeFalse();
  });

  it('should drop the average on tablets', async () => {
    await atWidth('768px');
    expect(visible('td.mat-column-average')).toBeFalse();
    expect(visible('td.mat-column-overview')).toBeTrue();
    expect(visible('.inline-actions')).toBeTrue();
  });

  it('should keep a phone table inside 320px in Spanish', async () => {
    TestBed.inject(LanguageStore).setLang('es');
    await atWidth('320px');
    expect(visible('td.mat-column-overview')).toBeFalse();
    expect(visible('td.mat-column-average')).toBeFalse();
    expect(visible('.inline-actions')).toBeFalse();
    expect(visible('.more-actions')).toBeTrue();
    expect(visible('td.mat-column-rating')).toBeTrue();
    expect(overflowingElements(host)).toEqual([]);
  });

  it('should keep rows dense with long titles on desktop and phones', async () => {
    TestBed.inject(LanguageStore).setLang('es');
    fixture.componentRef.setInput('rows', [
      { key: 'a', movie: movie(1, { title: 'El corredor del laberinto III: La cura mortal y otras historias largas' }) },
      { key: 'b', movie: movie(2) },
    ]);
    for (const width of ['1440px', '1024px', '768px', '375px', '320px']) {
      await atWidth(width);
      const row = host.querySelector('tr.movie-row')!.getBoundingClientRect();
      const title = host.querySelector<HTMLElement>('.title')!;
      expect(row.height).withContext(`row at ${width}`).toBeLessThanOrEqual(76);
      expect(title.getBoundingClientRect().height).withContext(`title at ${width}`).toBeLessThanOrEqual(42);
      expect(getComputedStyle(title).webkitLineClamp).toBe('2');
      expect(host.querySelector('td.mat-column-rating')!.getBoundingClientRect().height).toBeLessThanOrEqual(row.height);
      expect(overflowingElements(host)).withContext(width).toEqual([]);
    }
    await atWidth('1440px');
    const titleCell = host.querySelector('td.mat-column-title')!.getBoundingClientRect();
    expect(titleCell.width).toBeGreaterThanOrEqual(180);
    expect(titleCell.width).toBeLessThanOrEqual(260);
    const button = host.querySelector<HTMLElement>('.title-button')!;
    expect(button.title).toBe('El corredor del laberinto III: La cura mortal y otras historias largas');
  });

  it('should open and close the synopsis on phones with a height animation', async () => {
    await atWidth('320px');
    const title = host.querySelector<HTMLButtonElement>('.title-button')!;
    const detail = host.querySelector<HTMLElement>('tr.detail-row')!;
    const height = () => Math.round(detail.getBoundingClientRect().height);
    expect(height()).toBe(0);
    expect(detail.getAttribute('aria-hidden')).toBe('true');
    expect(getComputedStyle(detail.querySelector('.detail')!).transitionDuration).toBe('0.225s');

    async function heightsAfterTap(): Promise<number[]> {
      title.click();
      await fixture.whenStable();
      const heights: number[] = [];
      const end = performance.now() + 400;
      while (performance.now() < end) {
        await new Promise((resolve) => requestAnimationFrame(resolve));
        heights.push(height());
      }
      return heights;
    }

    const opening = await heightsAfterTap();
    const open = opening.at(-1)!;
    expect(title.getAttribute('aria-expanded')).toBe('true');
    expect(detail.getAttribute('aria-hidden')).toBe('false');
    expect(open).toBeGreaterThan(40);
    expect(opening.some((h) => h > 0 && h < open - 2)).withContext(opening.join(',')).toBeTrue();

    const closing = await heightsAfterTap();
    expect(closing.at(-1)).toBe(0);
    expect(closing.some((h) => h > 2 && h < open)).withContext(closing.join(',')).toBeTrue();
    expect(host.querySelector('tr.detail-row.expanded')).toBeNull();
  });

  it('should keep the synopsis row hidden on wider tables', async () => {
    await atWidth('768px');
    host.querySelector<HTMLButtonElement>('.title-button')!.click();
    await fixture.whenStable();
    expect(visible('tr.detail-row')).toBeFalse();
  });

  it('should keep the description at two lines and the row height on hover, focus and click', async () => {
    await atWidth('1200px');
    const cell = host.querySelector<HTMLElement>('td.overview-cell')!;
    const row = host.querySelector<HTMLElement>('tr.movie-row')!;
    const height = row.getBoundingClientRect().height;
    expect(cell.tabIndex).toBe(0);
    cell.dispatchEvent(new MouseEvent('mouseenter'));
    cell.focus();
    cell.click();
    await fixture.whenStable();
    expect(getComputedStyle(cell.querySelector('.overview')!).webkitLineClamp).toBe('2');
    expect(row.getBoundingClientRect().height).toBe(height);
    cell.blur();
  });

  describe('description tooltip', () => {
    const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
    // The tooltip of one cell, not a leftover overlay from another spec.
    const tipOf = (cell: HTMLElement) =>
      fixture.debugElement
        .queryAll(By.directive(MatTooltip))
        .find((debug) => debug.nativeElement === cell)!
        .injector.get(MatTooltip);
    // The newest panel is the one just opened.
    const latestPanel = () => Array.from(document.querySelectorAll('.description-tooltip')).at(-1);

    beforeEach(() => atWidth('1200px'));

    it('should show the full synopsis after 300ms when it is cut', async () => {
      const cell = host.querySelectorAll<HTMLElement>('td.overview-cell')[0];
      cell.dispatchEvent(new MouseEvent('mouseenter'));
      await wait(150);
      expect(tipOf(cell)._isTooltipVisible()).toBeFalse();
      await wait(300);
      await fixture.whenStable();
      expect(tipOf(cell)._isTooltipVisible()).toBeTrue();
      const panel = latestPanel()!;
      expect(panel.textContent?.trim()).toBe(rows[0].movie.overview.trim());
      const surface = panel.querySelector('.mdc-tooltip__surface')!;
      expect(getComputedStyle(surface).textAlign).toBe('left');
      expect(parseFloat(getComputedStyle(surface).maxWidth)).toBeGreaterThanOrEqual(400);
      // Screen readers get the same text through aria-describedby.
      expect(cell.getAttribute('aria-describedby')).toBeTruthy();
      cell.dispatchEvent(new MouseEvent('mouseleave'));
    });

    it('should not show a tooltip for a synopsis that fits', async () => {
      fixture.componentRef.setInput('rows', [{ key: 'c', movie: movie(3, { overview: 'Corta.' }) }]);
      await fixture.whenStable();
      const cell = host.querySelector<HTMLElement>('td.overview-cell')!;
      cell.dispatchEvent(new MouseEvent('mouseenter'));
      await wait(450);
      expect(tipOf(cell).disabled).toBeTrue();
      expect(tipOf(cell)._isTooltipVisible()).toBeFalse();
    });

    it('should open with the keyboard too', async () => {
      const cell = host.querySelectorAll<HTMLElement>('td.overview-cell')[0];
      TestBed.inject(FocusMonitor).focusVia(cell, 'keyboard');
      await wait(450);
      await fixture.whenStable();
      expect(tipOf(cell)._isTooltipVisible()).toBeTrue();
      expect(tipOf(cell).message).toContain('Una sinopsis larga');
      cell.blur();
    });
  });

  it('should hide remove in the row and in the phone menu when not removable', async () => {
    fixture.componentRef.setInput('removable', false);
    await atWidth('1200px');
    const row = host.querySelector('tr.movie-row')!;
    expect(row.querySelectorAll('.inline-actions button').length).toBe(3);
    expect(row.querySelector('.warn-button')).toBeNull();

    await atWidth('320px');
    row.querySelector<HTMLButtonElement>('.more-actions')!.click();
    await fixture.whenStable();
    const items = Array.from(document.querySelectorAll('.mat-mdc-menu-panel [mat-menu-item]')).map((item) =>
      item.textContent?.trim()
    );
    expect(items.length).toBe(3);
    expect(items.join(' ')).not.toContain('Remove');
    expect(Array.from(document.querySelectorAll('.mat-mdc-menu-panel mat-icon')).map((i) => i.textContent)).not.toContain('delete');
  });

  it('should send the actions to the shared service and emit remove', async () => {
    const actions = TestBed.inject(MovieActionsService);
    const watchlist = spyOn(actions, 'toggleWatchlist');
    const watched = spyOn(actions, 'toggleWatched');
    const rate = spyOn(actions, 'rate');
    const removed: MovieTableRow[] = [];
    fixture.componentInstance.remove.subscribe((row) => removed.push(row));
    await atWidth('1200px');

    const buttons = host.querySelectorAll<HTMLButtonElement>('tr.movie-row')[0].querySelectorAll<HTMLButtonElement>('.inline-actions button');
    buttons[0].click();
    buttons[1].click();
    buttons[3].click();
    host.querySelectorAll<HTMLElement>('tr.movie-row')[0].querySelectorAll<HTMLElement>('.half')[7].click();

    expect(watchlist).toHaveBeenCalledWith(rows[0].movie);
    expect(watched).toHaveBeenCalledWith(rows[0].movie);
    expect(rate).toHaveBeenCalledWith(rows[0].movie, 4);
    expect(removed).toEqual([rows[0]]);
    expect(buttons[3].getAttribute('aria-label')).toBe('Remove from history');
  });
});
