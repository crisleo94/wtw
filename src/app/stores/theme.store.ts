import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { computed, inject, Injectable, PLATFORM_ID, signal } from '@angular/core';

export type ThemeMode = 'light' | 'dark' | 'system';
export const THEME_KEY = 'wtw.theme';

// The inline script in index.html applies the same value before the first paint.
@Injectable({
  providedIn: 'root',
})
export class ThemeStore {
  private document = inject(DOCUMENT);
  private isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private current = signal<ThemeMode>(this.read());
  private systemDark = signal(this.watchSystem());

  readonly mode = this.current.asReadonly();
  readonly isDark = computed(() =>
    this.current() === 'system' ? this.systemDark() : this.current() === 'dark'
  );

  // Flips what is on screen; from then on the choice is explicit.
  toggle(): void {
    this.setMode(this.isDark() ? 'light' : 'dark');
  }

  setMode(mode: ThemeMode): void {
    this.current.set(mode);
    this.apply(mode);
    if (!this.isBrowser) {
      return;
    }
    try {
      if (mode === 'system') {
        localStorage.removeItem(THEME_KEY);
      } else {
        localStorage.setItem(THEME_KEY, mode);
      }
    } catch {
      // Storage can be blocked; the choice still applies to this page.
    }
  }

  private apply(mode: ThemeMode): void {
    this.document.documentElement.style.colorScheme =
      mode === 'system' ? '' : mode;
  }

  private watchSystem(): boolean {
    if (!this.isBrowser || typeof matchMedia !== 'function') {
      return false;
    }
    const query = matchMedia('(prefers-color-scheme: dark)');
    query.addEventListener('change', (event) => this.systemDark.set(event.matches));
    return query.matches;
  }

  private read(): ThemeMode {
    if (!this.isBrowser) {
      return 'system';
    }
    try {
      const saved = localStorage.getItem(THEME_KEY);
      return saved === 'light' || saved === 'dark' ? saved : 'system';
    } catch {
      return 'system';
    }
  }
}
