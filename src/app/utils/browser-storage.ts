export interface KeyValueStorage {
  get(key: string): string | null;
  set(key: string, value: string): void;
  remove(key: string): void;
}

// sessionStorage; reads and writes are no-ops when storage is blocked.
export function injectSessionStorage(): KeyValueStorage {
  return injectBrowserStorage(() => sessionStorage);
}

// localStorage; reads and writes are no-ops when storage is blocked.
export function injectLocalStorage(): KeyValueStorage {
  return injectBrowserStorage(() => localStorage);
}

// Runs `callback` when another tab changes `key` in localStorage; returns a cleanup.
export function onStorageChange(
  key: string,
  callback: (value: string | null) => void
): () => void {
  const listener = (event: StorageEvent) => {
    if (event.key === key || event.key === null) {
      callback(event.key === null ? null : event.newValue);
    }
  };
  window.addEventListener('storage', listener);
  return () => window.removeEventListener('storage', listener);
}

function injectBrowserStorage(storage: () => Storage): KeyValueStorage {
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
