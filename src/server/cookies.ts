export const TOKEN_COOKIE = 'wtw_token';
const FALLBACK_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

export function parseCookies(header: string | undefined): Record<string, string> {
  const cookies: Record<string, string> = {};
  for (const part of (header ?? '').split(';')) {
    const index = part.indexOf('=');
    const name = part.slice(0, index).trim();
    if (index < 0 || !name) {
      continue;
    }
    const value = part.slice(index + 1).trim();
    try {
      cookies[name] = decodeURIComponent(value);
    } catch {
      cookies[name] = value;
    }
  }
  return cookies;
}

function serializeCookie(value: string, maxAge: number, secure: boolean): string {
  const attributes = [
    `${TOKEN_COOKIE}=${encodeURIComponent(value)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${maxAge}`,
  ];
  if (secure) {
    attributes.push('Secure');
  }
  return attributes.join('; ');
}

// Lifetime from the JWT `exp` claim (not verified here: the API does that).
export function tokenMaxAge(token: string, now = Date.now()): number {
  try {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const { exp } = JSON.parse(atob(payload.padEnd(Math.ceil(payload.length / 4) * 4, '=')));
    if (typeof exp === 'number') {
      return Math.max(0, Math.floor(exp - now / 1000));
    }
  } catch {
    // Not a readable JWT: use the fallback below.
  }
  return FALLBACK_MAX_AGE_SECONDS;
}

export function serializeTokenCookie(token: string, secure: boolean): string {
  return serializeCookie(token, tokenMaxAge(token), secure);
}

export function clearTokenCookie(secure: boolean): string {
  return serializeCookie('', 0, secure);
}
