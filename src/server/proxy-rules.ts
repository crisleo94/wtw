export interface ProxyError {
  statusCode: number;
  message: string;
}

// Only the routes the front uses reach the API (no Swagger or future internals).
const ALLOWED_PATHS = /^\/api\/(genres|(movies|auth|me)\/[^/].*)$/;

// Checks the normalized URL, so `..` or encoded dots cannot leave the allowlist.
export function resolveApiUrl(url: string, apiUrl: string): URL | null {
  const target = new URL(`/api${url}`, apiUrl);
  return ALLOWED_PATHS.test(target.pathname) ? target : null;
}

export const NOT_FOUND: ProxyError = { statusCode: 404, message: 'Not found' };

// Body parser errors keep their 4xx status; anything else is a BFF failure.
export function toProxyError(error: unknown): ProxyError {
  const { status, type, name } = (error ?? {}) as {
    status?: number;
    type?: string;
    name?: string;
  };
  if (type === 'entity.too.large') {
    return { statusCode: 413, message: 'Request body is too large' };
  }
  if (typeof status === 'number' && status >= 400 && status < 500) {
    return { statusCode: status, message: 'Invalid request' };
  }
  if (name === 'TimeoutError') {
    return { statusCode: 504, message: 'API did not respond in time' };
  }
  if (name === 'SyntaxError') {
    return { statusCode: 502, message: 'API sent an invalid response' };
  }
  return { statusCode: 502, message: 'API is unavailable' };
}
