// Keys of the anonymous library. Guests keep it in localStorage, others in sessionStorage.
export const SESSION_KEY = 'wtw.session.v1';
export const REJECTED_KEY = 'wtw.session.rejected.v1';
export const GUEST_KEY = 'wtw.guest.v1';
export const GUEST_ACTIVE_KEY = 'wtw.guest.activeAt.v1';

// A guest library unused for this long is dropped on the next visit.
export const GUEST_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export function isGuestExpired(activeAt: string | null, now = Date.now()): boolean {
  const time = Number(activeAt);
  return !Number.isFinite(time) || time <= 0 || now - time > GUEST_TTL_MS;
}
