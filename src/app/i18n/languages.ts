export const APP_LANGUAGES = ['en', 'es'] as const;
export type AppLanguage = (typeof APP_LANGUAGES)[number];
export const DEFAULT_LANGUAGE: AppLanguage = 'en';

// Shown in their own language, so they are not translated.
export const LANGUAGE_NAMES: Record<AppLanguage, string> = {
  en: 'English',
  es: 'Español',
};

// Maps values like `es-AR` or an Accept-Language header to a supported language.
export function toAppLanguage(value: string | null | undefined): AppLanguage | null {
  const tag = value?.trim().slice(0, 2).toLowerCase();
  return APP_LANGUAGES.find((lang) => lang === tag) ?? null;
}
