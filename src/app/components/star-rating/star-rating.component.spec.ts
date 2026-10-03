import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslocoService } from '@jsverse/transloco';
import { getTranslocoTestingModule } from '../../testing/transloco-testing';
import { StarRatingComponent } from './star-rating.component';

describe('StarRatingComponent', () => {
  let fixture: ComponentFixture<StarRatingComponent>;
  let emitted: (number | null)[];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StarRatingComponent, getTranslocoTestingModule()],
    }).compileComponents();
    fixture = TestBed.createComponent(StarRatingComponent);
    emitted = [];
    fixture.componentInstance.rate.subscribe((value) => emitted.push(value));
  });

  afterEach(() => TestBed.inject(TranslocoService).setActiveLang('en'));

  async function render(value: number | null) {
    fixture.componentRef.setInput('value', value);
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  const slider = () => (fixture.nativeElement as HTMLElement).querySelector('[role="slider"]') as HTMLElement;
  const press = (key: string) => slider().dispatchEvent(new KeyboardEvent('keydown', { key, cancelable: true }));
  const icons = (host: HTMLElement) =>
    Array.from(host.querySelectorAll('.star mat-icon')).map((icon) => icon.textContent?.trim());

  it('should draw full, half and empty stars', async () => {
    const host = await render(3.5);
    expect(icons(host)).toEqual(['star', 'star', 'star', 'star_half', 'star_border']);
  });

  it('should pick half and full stars and clear when picking the current value', async () => {
    const host = await render(null);
    const halves = host.querySelectorAll<HTMLElement>('.half');
    halves[2].click(); // left half of the 2nd star
    halves[9].click(); // right half of the 5th star
    expect(emitted).toEqual([1.5, 5]);

    await render(1.5);
    halves[2].click();
    expect(emitted.at(-1)).toBeNull();
  });

  it('should expose an accessible slider with a translated value', async () => {
    await render(4.5);
    expect(slider().getAttribute('aria-valuemin')).toBe('0');
    expect(slider().getAttribute('aria-valuemax')).toBe('5');
    expect(slider().getAttribute('aria-valuenow')).toBe('4.5');
    expect(slider().getAttribute('aria-valuetext')).toBe('4.5 of 5 stars');

    TestBed.inject(TranslocoService).setActiveLang('es');
    await render(4.5);
    expect(slider().getAttribute('aria-valuetext')).toBe('4,5 de 5 estrellas');
    await render(null);
    expect(slider().getAttribute('aria-valuenow')).toBe('0');
    expect(slider().getAttribute('aria-valuetext')).toBe('Sin calificar');
  });

  it('should move half a star with the arrows and jump with Home and End', async () => {
    await render(null);
    press('ArrowRight');
    press('Home');
    press('End');
    await render(5);
    press('ArrowUp');
    press('ArrowLeft');
    await render(0.5);
    press('ArrowDown');
    expect(emitted).toEqual([0.5, 0.5, 5, 4.5, null]);
  });

  it('should clear with Delete, Backspace, 0 or the clear button', async () => {
    const host = await render(3);
    press('Delete');
    press('Backspace');
    press('0');
    (host.querySelector('.clear') as HTMLButtonElement).click();
    expect(emitted).toEqual([null, null, null, null]);
  });

  it('should ignore other keys and keep the page scroll for them', async () => {
    await render(2);
    const event = new KeyboardEvent('keydown', { key: 'a', cancelable: true });
    slider().dispatchEvent(event);
    expect(event.defaultPrevented).toBeFalse();
    expect(emitted).toEqual([]);
  });
});
