import { TestBed } from '@angular/core/testing';
import { THEME_KEY, ThemeStore } from './theme.store';

describe('ThemeStore', () => {
  const systemDark = () => matchMedia('(prefers-color-scheme: dark)').matches;

  afterEach(() => {
    localStorage.removeItem(THEME_KEY);
    document.documentElement.style.colorScheme = '';
  });

  it('should follow the system by default', () => {
    expect(TestBed.inject(ThemeStore).isDark()).toBe(systemDark());
    expect(document.documentElement.style.colorScheme).toBe('');
  });

  it('should apply and remember a forced mode', () => {
    const store = TestBed.inject(ThemeStore);
    store.setMode('dark');
    expect(store.isDark()).toBeTrue();
    expect(document.documentElement.style.colorScheme).toBe('dark');
    expect(localStorage.getItem(THEME_KEY)).toBe('dark');

    store.setMode('light');
    expect(store.isDark()).toBeFalse();
    expect(localStorage.getItem(THEME_KEY)).toBe('light');

    store.setMode('system');
    expect(store.isDark()).toBe(systemDark());
    expect(document.documentElement.style.colorScheme).toBe('');
    expect(localStorage.getItem(THEME_KEY)).toBeNull();
  });

  it('should restore the saved mode', () => {
    localStorage.setItem(THEME_KEY, 'dark');
    expect(TestBed.inject(ThemeStore).isDark()).toBeTrue();
    TestBed.resetTestingModule();
    localStorage.setItem(THEME_KEY, 'light');
    expect(TestBed.inject(ThemeStore).isDark()).toBeFalse();
  });

});
