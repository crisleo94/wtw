import en from '../../assets/i18n/en.json';
import es from '../../assets/i18n/es.json';
import { toAppLanguage } from './languages';

function keys(value: object, prefix = ''): string[] {
  return Object.entries(value).flatMap(([key, child]) =>
    child && typeof child === 'object'
      ? keys(child, `${prefix}${key}.`)
      : [`${prefix}${key}`]
  );
}

describe('translations', () => {
  it('should have the same keys in English and Spanish', () => {
    expect(keys(es).sort()).toEqual(keys(en).sort());
  });

  it('should map language tags to a supported language', () => {
    expect(toAppLanguage('es-AR')).toBe('es');
    expect(toAppLanguage('en-US,en;q=0.9')).toBe('en');
    expect(toAppLanguage('fr-FR')).toBeNull();
    expect(toAppLanguage(null)).toBeNull();
  });
});
