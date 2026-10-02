import { Injectable } from '@angular/core';
import { Translation, TranslocoLoader } from '@jsverse/transloco';
import { AppLanguage } from './languages';

// Bundled with import() so SSR doesn't need to fetch a relative URL.
const TRANSLATIONS: Record<AppLanguage, () => Promise<{ default: Translation }>> = {
  en: () => import('../../assets/i18n/en.json'),
  es: () => import('../../assets/i18n/es.json'),
};

@Injectable({ providedIn: 'root' })
export class JsonTranslocoLoader implements TranslocoLoader {
  getTranslation(lang: string): Promise<Translation> {
    const load = TRANSLATIONS[lang as AppLanguage] ?? TRANSLATIONS.en;
    return load().then((module) => module.default);
  }
}
