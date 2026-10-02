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
  if (!isPlatformBrowser(inject(PLATFORM_ID))) {
    return noopStorage;
  }
  return {
    get: (key) => attempt(() => sessionStorage.getItem(key), null),
    set: (key, value) => attempt(() => sessionStorage.setItem(key, value), undefined),
    remove: (key) => attempt(() => sessionStorage.removeItem(key), undefined),
  };
}

function attempt<T>(action: () => T, fallback: T): T {
  try {
    return action();
  } catch {
    return fallback;
  }
}
