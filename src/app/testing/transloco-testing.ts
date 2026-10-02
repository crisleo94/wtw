import {
  TranslocoTestingModule,
  TranslocoTestingOptions,
} from '@jsverse/transloco';
import en from '../../assets/i18n/en.json';
import es from '../../assets/i18n/es.json';
import { APP_LANGUAGES, DEFAULT_LANGUAGE } from '../i18n/languages';

// Real EN/ES files, preloaded, so specs can assert on translated text.
export function getTranslocoTestingModule(options: TranslocoTestingOptions = {}) {
  return TranslocoTestingModule.forRoot({
    langs: { en, es },
    translocoConfig: {
      availableLangs: [...APP_LANGUAGES],
      defaultLang: DEFAULT_LANGUAGE,
      reRenderOnLangChange: true,
    },
    preloadLangs: true,
    ...options,
  });
}
