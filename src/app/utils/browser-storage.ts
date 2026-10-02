import { isPlatformBrowser } from '@angular/common';
import { inject, PLATFORM_ID } from '@angular/core';

export interface KeyValueStorage {
  get(key: string): string | null;
  set(key: string, value: string): void;
  remove(key: string): void;
}

const noopStorage: KeyValueStorage = {
  get: () => null,
  set: () => undefined,
  remove: () => undefined,
};

// sessionStorage in the browser; a no-op on the server or when storage is blocked.
export function injectSessionStorage(): KeyValueStorage {
  return injectBrowserStorage(() => sessionStorage);
}

// localStorage in the browser; a no-op on the server or when storage is blocked.
export function injectLocalStorage(): KeyValueStorage {
  return injectBrowserStorage(() => localStorage);
}

// Runs `callback` when another tab changes `key` in localStorage; returns a cleanup.
export function onStorageChange(
  key: string,
  callback: (value: string | null) => void
): () => void {
  if (!isPlatformBrowser(inject(PLATFORM_ID)) || typeof window === 'undefined') {
    return () => undefined;
  }
  const listener = (event: StorageEvent) => {
    if (event.key === key || event.key === null) {
      callback(event.key === null ? null : event.newValue);
    }
  };
  window.addEventListener('storage', listener);
  return () => window.removeEventListener('storage', listener);
}

function injectBrowserStorage(storage: () => Storage): KeyValueStorage {
  if (!isPlatformBrowser(inject(PLATFORM_ID))) {
    return noopStorage;
  }
  return {
    get: (key) => attempt(() => storage().getItem(key), null),
    set: (key, value) => attempt(() => storage().setItem(key, value), undefined),
    remove: (key) => attempt(() => storage().removeItem(key), undefined),
  };
}

function attempt<T>(action: () => T, fallback: T): T {
  try {
    return action();
  } catch {
    return fallback;
  }
}
