import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { inject, Injectable, PLATFORM_ID, signal } from '@angular/core';

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

  readonly mode = this.current.asReadonly();

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
