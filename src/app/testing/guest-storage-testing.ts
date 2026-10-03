import {
  GUEST_ACTIVE_KEY,
  GUEST_KEY,
  REJECTED_KEY,
  SESSION_KEY,
} from '../stores/guest-storage';
import { SIGNED_IN_KEY } from '../stores/auth.store';

// Removes the anonymous library and guest flags from both storages between specs.
export function clearAnonymousStorage(): void {
  for (const storage of [localStorage, sessionStorage]) {
    for (const key of [SESSION_KEY, REJECTED_KEY, GUEST_KEY, GUEST_ACTIVE_KEY, SIGNED_IN_KEY]) {
      storage.removeItem(key);
    }
  }
}
