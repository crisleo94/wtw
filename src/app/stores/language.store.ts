import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { inject, Injectable, PLATFORM_ID, REQUEST, signal } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { firstValueFrom } from 'rxjs';
import {
  AppLanguage,
  DEFAULT_LANGUAGE,
  toAppLanguage,
} from '../i18n/languages';

export const LANGUAGE_KEY = 'wtw.lang';

// Saved choice > browser language (es* -> es) > English; on the server, Accept-Language.
@Injectable({
  providedIn: 'root',
})
export class LanguageStore {
  private document = inject(DOCUMENT);
  private transloco = inject(TranslocoService);
  private request = inject(REQUEST, { optional: true });
  private isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private current = signal<AppLanguage>(this.initial());

  readonly lang = this.current.asReadonly();

  // Loads the translation before the first render (SSR and hydration).
  init(): Promise<unknown> {
    this.apply(this.current());
    return firstValueFrom(this.transloco.load(this.current()));
  }

  setLang(lang: AppLanguage): void {
    this.current.set(lang);
    this.apply(lang);
    if (!this.isBrowser) {
      return;
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
    if (!this.isBrowser) {
      const header = this.request?.headers.get('accept-language');
      return toAppLanguage(header) ?? DEFAULT_LANGUAGE;
    }
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
