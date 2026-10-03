import { DOCUMENT } from '@angular/common';
import { inject, Injectable, signal } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { firstValueFrom, Subject } from 'rxjs';
import { AppLanguage, DEFAULT_LANGUAGE, toAppLanguage } from '../i18n/languages';

export const LANGUAGE_KEY = 'wtw.lang';

// Saved choice > browser language > English.
@Injectable({
  providedIn: 'root',
})
export class LanguageStore {
  private document = inject(DOCUMENT);
  private transloco = inject(TranslocoService);
  private current = signal<AppLanguage>(this.initial());
  private changes = new Subject<AppLanguage>();

  readonly lang = this.current.asReadonly();
  // Emits only when the user switches to a different language.
  readonly changed$ = this.changes.asObservable();

  // Loads the translation before the first render.
  init(): Promise<unknown> {
    this.apply(this.current());
    return firstValueFrom(this.transloco.load(this.current()));
  }

  setLang(lang: AppLanguage): void {
    const previous = this.current();
    this.current.set(lang);
    this.apply(lang);
    if (lang !== previous) {
      this.changes.next(lang);
    }
    try {
      localStorage.setItem(LANGUAGE_KEY, lang);
    } catch {
      // Storage can be blocked; the choice still applies to this page.
    }
  }

  private apply(lang: AppLanguage): void {
    this.transloco.setActiveLang(lang);
    this.document.documentElement.lang = lang;
  }

  private initial(): AppLanguage {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(LANGUAGE_KEY);
    } catch {
      // Ignore blocked storage.
    }
    return (
      toAppLanguage(saved) ??
      toAppLanguage(globalThis.navigator?.language) ??
      DEFAULT_LANGUAGE
    );
  }
}
