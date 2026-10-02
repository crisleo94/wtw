import {
  clearTokenCookie,
  parseCookies,
  serializeTokenCookie,
} from './cookies';

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
});
