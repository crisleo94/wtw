import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslocoService } from '@jsverse/transloco';
import { getTranslocoTestingModule, overflowingElements } from '../../testing/transloco-testing';
import { AppFooterComponent } from './app-footer.component';

// WCAG contrast ratio of two `rgb(...)` colors.
function contrast(a: string, b: string): number {
  const luminance = (color: string) => {
    const [r, g, bl] = color.match(/[\d.]+/g)!.slice(0, 3).map((value) => {
      const c = Number(value) / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

describe('AppFooterComponent', () => {
  let fixture: ComponentFixture<AppFooterComponent>;
  let element: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppFooterComponent, getTranslocoTestingModule()],
    }).compileComponents();
    fixture = TestBed.createComponent(AppFooterComponent);
    element = fixture.nativeElement;
    await fixture.whenStable();
  });

  afterEach(() => {
    document.documentElement.style.colorScheme = '';
    TestBed.inject(TranslocoService).setActiveLang('en');
  });

  it('should credit TMDB with its logo and exact notice', () => {
    const link = element.querySelector<HTMLAnchorElement>('a.tmdb')!;
    expect(link.href).toBe('https://www.themoviedb.org/');
    expect(link.rel).toBe('noopener');
    expect(link.querySelector('img')!.getAttribute('src')).toBe('assets/images/tmdb-logo.svg');
    expect(link.querySelector('img')!.alt).toBe('The Movie Database (TMDB)');
    const notice = element.querySelector('.notice')!;
    expect(notice.textContent).toBe('This product uses the TMDB API but is not endorsed or certified by TMDB.');
    expect(notice.getAttribute('lang')).toBe('en');
  });

  it('should credit JustWatch, translated, and keep the signature as is', async () => {
    const justwatch = element.querySelector<HTMLAnchorElement>('.justwatch a')!;
    expect(element.querySelector('.justwatch')!.textContent).toContain('Streaming data provided by JustWatch');
    expect(justwatch.href).toBe('https://www.justwatch.com/');
    expect(element.querySelector('.signature span')!.textContent).toBe('Made by CodeScripters with love');
    expect(element.querySelector('.heart')!.getAttribute('aria-hidden')).toBe('true');
    expect(element.querySelector('.year')!.textContent).toContain(String(new Date().getFullYear()));

    TestBed.inject(TranslocoService).setActiveLang('es');
    await fixture.whenStable();
    expect(element.querySelector('.justwatch')!.textContent).toContain('Datos de streaming proporcionados por JustWatch');
    expect(element.querySelector('.notice')!.textContent).toContain('This product uses the TMDB API');
    expect(element.querySelector('.signature span')!.textContent).toBe('Made by CodeScripters with love');
  });

  for (const scheme of ['light', 'dark']) {
    it(`should keep AA contrast in ${scheme} mode`, async () => {
      document.documentElement.style.colorScheme = scheme;
      await fixture.whenStable();
      const background = getComputedStyle(element.querySelector('.footer')!).backgroundColor;
      for (const selector of ['.notice', '.justwatch', '.justwatch a', '.signature span', '.year']) {
        const color = getComputedStyle(element.querySelector(selector)!).color;
        expect(contrast(color, background)).withContext(selector).toBeGreaterThanOrEqual(4.5);
      }
    });
  }

  it('should fit a 320px screen', async () => {
    element.style.width = '320px';
    await fixture.whenStable();
    expect(overflowingElements(element)).toEqual([]);
  });
});
