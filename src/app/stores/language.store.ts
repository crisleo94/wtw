import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { inject, Injectable, PLATFORM_ID, REQUEST, signal } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { firstValueFrom, Subject } from 'rxjs';
import { parseCookies } from '../../server/cookies';
import {
  AppLanguage,
  DEFAULT_LANGUAGE,
  LANGUAGE_COOKIE,
  serializeLanguageCookie,
  toAppLanguage,
} from '../i18n/languages';

export const LANGUAGE_KEY = 'wtw.lang';

// Browser: saved choice > cookie > browser language > English.
// Server: `wtw_lang` cookie > Accept-Language > English.
@Injectable({
  providedIn: 'root',
})
export class LanguageStore {
  private document = inject(DOCUMENT);
  private transloco = inject(TranslocoService);
  private request = inject(REQUEST, { optional: true });
  private isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private current = signal<AppLanguage>(this.initial());
  private changes = new Subject<AppLanguage>();

  readonly lang = this.current.asReadonly();
  // Emits only when the user switches to a different language.
  readonly changed$ = this.changes.asObservable();

  // Loads the translation before the first render (SSR and hydration).
  init(): Promise<unknown> {
    this.apply(this.current());
    // Choices saved before the cookie existed reach the next SSR too.
    if (this.isBrowser && this.readCookie() !== this.current()) {
      this.writeCookie(this.current());
    }
    return firstValueFrom(this.transloco.load(this.current()));
  }

  setLang(lang: AppLanguage): void {
    const previous = this.current();
    this.current.set(lang);
    this.apply(lang);
    if (lang !== previous) {
      this.changes.next(lang);
    }
    if (!this.isBrowser) {
      return;
    }
    this.writeCookie(lang);
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
      return this.readCookie() ?? toAppLanguage(header) ?? DEFAULT_LANGUAGE;
    }
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(LANGUAGE_KEY);
    } catch {
      // Ignore blocked storage.
    }
    return (
      toAppLanguage(saved) ??
      this.readCookie() ??
      toAppLanguage(globalThis.navigator?.language) ??
      DEFAULT_LANGUAGE
    );
  }

  private readCookie(): AppLanguage | null {
    const header = this.isBrowser
      ? this.document.cookie
      : this.request?.headers.get('cookie');
    return toAppLanguage(parseCookies(header ?? undefined)[LANGUAGE_COOKIE]);
  }

  private writeCookie(lang: AppLanguage): void {
    const secure = this.document.location?.protocol === 'https:';
    this.document.cookie = serializeLanguageCookie(lang, secure);
  }
}
