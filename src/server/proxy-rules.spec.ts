import { resolveApiUrl, toProxyError } from './proxy-rules';

const API = 'http://wtw-api:3000';

describe('proxy rules', () => {
  it('should allow the routes the front uses', () => {
    for (const url of [
      '/genres',
      '/movies/generate?yearFrom=1990',
      '/movies/603',
      '/auth/me',
      '/auth/login',
      '/me/lists/l1/items/7',
      '/me/history?limit=50',
    ]) {
      expect(resolveApiUrl(url, API)?.href).toBe(`${API}/api${url}`);
    }
  });

  it('should block Swagger and unknown routes', () => {
    for (const url of ['', '/', '/?x=1', '-json', '/docs', '/genres/1', '/movies', '/me', '/auth/', '/health']) {
      expect(resolveApiUrl(url, API)).withContext(url).toBeNull();
    }
  });

  it('should not let dot segments leave the allowlist', () => {
    for (const url of ['/movies/../', '/movies/%2e%2e/', '/me/..%2F..', '/auth/.%2E/docs', '/movies\\..\\']) {
      const target = resolveApiUrl(url, API);
      expect(target === null || /^\/api\/(movies|me|auth)\/[^/]/.test(target.pathname))
        .withContext(url)
        .toBeTrue();
    }
    expect(resolveApiUrl('/movies/../', API)).toBeNull();
  });

  it('should answer a too large body with a JSON 413', () => {
    const error = Object.assign(new Error('request entity too large'), {
      status: 413,
      type: 'entity.too.large',
    });
    expect(toProxyError(error)).toEqual({ statusCode: 413, message: 'Request body is too large' });
  });

  it('should map timeouts, invalid API responses and other failures', () => {
    const timeout = Object.assign(new Error('timeout'), { name: 'TimeoutError' });
    expect(toProxyError(timeout).statusCode).toBe(504);
    expect(toProxyError(new SyntaxError('Unexpected token <'))).toEqual({
      statusCode: 502,
      message: 'API sent an invalid response',
    });
    expect(toProxyError(new TypeError('fetch failed')).statusCode).toBe(502);
    expect(toProxyError({ status: 400, type: 'encoding.unsupported' }).statusCode).toBe(400);
    expect(toProxyError(undefined).statusCode).toBe(502);
  });
});
