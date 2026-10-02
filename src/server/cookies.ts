export const TOKEN_COOKIE = 'wtw_token';
// Not sensitive and readable by the client: only says that a token cookie exists.
export const SESSION_COOKIE = 'wtw_session';
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

function serializeCookie(
  name: string,
  value: string,
  maxAge: number,
  secure: boolean,
  httpOnly = true,
): string {
  const attributes = [
    `${name}=${encodeURIComponent(value)}`,
    'Path=/',
    ...(httpOnly ? ['HttpOnly'] : []),
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
  return serializeCookie(TOKEN_COOKIE, token, tokenMaxAge(token), secure);
}

export function clearTokenCookie(secure: boolean): string {
  return serializeCookie(TOKEN_COOKIE, '', 0, secure);
}

// Token cookie plus the readable `wtw_session=1`, with the same lifetime.
export function serializeSessionCookies(token: string, secure: boolean): string[] {
  const maxAge = tokenMaxAge(token);
  return [
    serializeCookie(TOKEN_COOKIE, token, maxAge, secure),
    serializeCookie(SESSION_COOKIE, '1', maxAge, secure, false),
  ];
}

export function clearSessionCookies(secure: boolean): string[] {
  return [clearTokenCookie(secure), serializeCookie(SESSION_COOKIE, '', 0, secure, false)];
}
