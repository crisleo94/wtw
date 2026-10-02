import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AppComponent } from './app.component';

describe('AppComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render title', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('What to Watch?');
  });

  it('should show a friendly message when there are no results', async () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.componentInstance.recieveMovie(null);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.message')?.textContent).toContain(
      'No movies match these filters'
    );
  });

  describe('header layout', () => {
    async function measure(width: string) {
      const fixture = TestBed.createComponent(AppComponent);
      const host = fixture.nativeElement as HTMLElement;
      host.style.display = 'block';
      host.style.width = width;
      await fixture.whenStable();
      const header = host.querySelector('.header')!.getBoundingClientRect();
      const title = host.querySelector('h1')!.getBoundingClientRect();
      const actions = host.querySelector('.header-actions')!.getBoundingClientRect();
      return { header, title, actions };
    }

    it('should keep the title centered and the actions top right on desktop', async () => {
      const { header, title, actions } = await measure('1280px');
      const center = (rect: DOMRect) => rect.left + rect.width / 2;
      expect(Math.abs(center(title) - center(header))).toBeLessThan(1);
      expect(Math.abs(header.right - actions.right - 16)).toBeLessThan(1);
      expect(Math.abs(actions.top - title.top)).toBeLessThan(1);
    });

    it('should not overlap the title on a 320px screen', async () => {
      const { title, actions } = await measure('320px');
      expect(title.right).toBeLessThanOrEqual(actions.left);
    });
  });
});
