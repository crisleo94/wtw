export const TOKEN_COOKIE = 'wtw_token';
const TOKEN_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

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

export function serializeTokenCookie(token: string, secure: boolean): string {
  return serializeCookie(token, TOKEN_MAX_AGE_SECONDS, secure);
}

export function clearTokenCookie(secure: boolean): string {
  return serializeCookie('', 0, secure);
}
