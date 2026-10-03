import { Component, computed, inject, input, output } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatIconModule } from '@angular/material/icon';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';

export const MAX_RATING = 5;
const STEP = 0.5;

// 0.5 to 5 stars in half steps, or null (not rated). Controlled: it only emits
// `rate`; the parent saves the value and passes it back.
@Component({
  selector: 'app-star-rating',
  imports: [MatIconModule, TranslocoPipe],
  templateUrl: './star-rating.component.html',
  styleUrl: './star-rating.component.sass',
})
export class StarRatingComponent {
  private transloco = inject(TranslocoService);
  private lang = toSignal(this.transloco.langChanges$, {
    initialValue: this.transloco.getActiveLang(),
  });

  value = input<number | null>(null);
  // Accessible name, e.g. "Your rating for Alien".
  label = input('');
  rate = output<number | null>();

  readonly stars = [1, 2, 3, 4, 5];

  valueText = computed(() => {
    const value = this.value();
    const lang = this.lang();
    return value
      ? this.transloco.translate('rating.value', { value: value.toLocaleString(lang) }, lang)
      : this.transloco.translate('rating.none', {}, lang);
  });

  icon(star: number): string {
    const value = this.value() ?? 0;
    if (value >= star) {
      return 'star';
    }
    return value >= star - STEP ? 'star_half' : 'star_border';
  }

  // Picking the current value again clears it.
  select(value: number): void {
    this.emit(value === this.value() ? null : value);
  }

  clear(): void {
    this.emit(null);
  }

  onKeydown(event: KeyboardEvent): void {
    const current = this.value() ?? 0;
    const next = nextValue(event.key, current);
    if (next === undefined) {
      return;
    }
    event.preventDefault();
    this.emit(next);
  }

  private emit(value: number | null): void {
    if (value !== this.value()) {
      this.rate.emit(value);
    }
  }
}

// Arrows move half a star, Home/End jump to the ends, Delete/Backspace/0 clear.
function nextValue(key: string, current: number): number | null | undefined {
  switch (key) {
    case 'ArrowRight':
    case 'ArrowUp':
      return Math.min(MAX_RATING, current + STEP);
    case 'ArrowLeft':
    case 'ArrowDown':
      return current - STEP > 0 ? current - STEP : null;
    case 'Home':
      return STEP;
    case 'End':
      return MAX_RATING;
    case 'Delete':
    case 'Backspace':
    case '0':
      return null;
    default:
      return undefined;
  }
}
