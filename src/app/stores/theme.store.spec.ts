import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { THEME_KEY, ThemeStore } from './theme.store';

describe('ThemeStore', () => {
  afterEach(() => {
    localStorage.removeItem(THEME_KEY);
    document.documentElement.style.colorScheme = '';
  });

  it('should follow the system by default', () => {
    expect(TestBed.inject(ThemeStore).mode()).toBe('system');
  });

  it('should apply and remember a forced mode', () => {
    const store = TestBed.inject(ThemeStore);
    store.setMode('dark');
    expect(document.documentElement.style.colorScheme).toBe('dark');
    expect(localStorage.getItem(THEME_KEY)).toBe('dark');

    store.setMode('system');
    expect(document.documentElement.style.colorScheme).toBe('');
    expect(localStorage.getItem(THEME_KEY)).toBeNull();
  });

  it('should restore the saved mode', () => {
    localStorage.setItem(THEME_KEY, 'light');
    expect(TestBed.inject(ThemeStore).mode()).toBe('light');
  });

  it('should ignore storage on the server', () => {
    localStorage.setItem(THEME_KEY, 'dark');
    TestBed.overrideProvider(PLATFORM_ID, { useValue: 'server' });
    expect(TestBed.inject(ThemeStore).mode()).toBe('system');
  });
});
