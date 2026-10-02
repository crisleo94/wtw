import {
  clearTokenCookie,
  parseCookies,
  serializeTokenCookie,
  tokenMaxAge,
} from './cookies';

const jwt = (payload: object) =>
  `h.${btoa(JSON.stringify(payload)).replace(/=+$/, '')}.s`;

describe('cookies', () => {
  it('should parse a cookie header', () => {
    expect(parseCookies('a=1; wtw_token=abc%20d; broken')).toEqual({
      a: '1',
      wtw_token: 'abc d',
    });
    expect(parseCookies(undefined)).toEqual({});
  });

  it('should serialize the token as an httpOnly lax cookie', () => {
    const cookie = serializeTokenCookie('abc', false);
    expect(cookie).toContain('wtw_token=abc');
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=Lax');
    expect(cookie).not.toContain('Secure');
    expect(serializeTokenCookie('abc', true)).toContain('Secure');
  });

  it('should expire the cookie on clear', () => {
    expect(clearTokenCookie(false)).toContain('Max-Age=0');
  });

  it('should align Max-Age with the JWT expiration', () => {
    const now = 1_700_000_000_000;
    expect(tokenMaxAge(jwt({ id: 'u1', exp: now / 1000 + 3600 }), now)).toBe(3600);
    expect(tokenMaxAge(jwt({ exp: now / 1000 - 10 }), now)).toBe(0);
    expect(tokenMaxAge('not-a-jwt', now)).toBe(60 * 60 * 24 * 7);
    expect(tokenMaxAge(jwt({ id: 'u1' }), now)).toBe(60 * 60 * 24 * 7);
  });
});
