import express, { Request, Response, Router } from 'express';
import {
  clearTokenCookie,
  parseCookies,
  serializeTokenCookie,
  TOKEN_COOKIE,
} from './cookies';

export interface ApiProxyOptions {
  apiUrl: string;
  timeoutMs: number;
  secureCookie: boolean;
}

const FORWARDED_HEADERS = ['accept', 'accept-language', 'content-type'];
const RETURNED_HEADERS = ['content-type', 'cache-control', 'etag', 'location'];
const TOKEN_ROUTES = new Set(['/auth/login', '/auth/register']);

// Proxies /api/* to the backend; the JWT only lives in an httpOnly cookie.
export function apiProxy(options: ApiProxyOptions): Router {
  const router = express.Router();
  router.use(express.raw({ type: () => true, limit: '1mb' }));

  router.post('/auth/logout', (_req, res) => {
    res.setHeader('Set-Cookie', clearTokenCookie(options.secureCookie));
    res.status(204).end();
  });

  router.use(async (req, res) => {
    const token = parseCookies(req.headers.cookie)[TOKEN_COOKIE];
    let apiResponse: globalThis.Response;
    try {
      apiResponse = await fetch(new URL(`/api${req.url}`, options.apiUrl), {
        method: req.method,
        headers: buildHeaders(req, token),
        body: hasBody(req) ? new Uint8Array(req.body) : undefined,
        redirect: 'manual',
        signal: AbortSignal.timeout(options.timeoutMs),
      });
    } catch (error) {
      sendProxyError(res, error);
      return;
    }

    if (apiResponse.status === 401 && token) {
      res.setHeader('Set-Cookie', clearTokenCookie(options.secureCookie));
    }
    if (TOKEN_ROUTES.has(req.path) && apiResponse.ok) {
      await sendWithoutToken(res, apiResponse, options.secureCookie);
      return;
    }

    for (const name of RETURNED_HEADERS) {
      const value = apiResponse.headers.get(name);
      if (value) {
        res.setHeader(name, value);
      }
    }
    res
      .status(apiResponse.status)
      .send(Buffer.from(await apiResponse.arrayBuffer()));
  });

  return router;
}

function buildHeaders(req: Request, token?: string): Headers {
  const headers = new Headers();
  for (const name of FORWARDED_HEADERS) {
    const value = req.headers[name];
    if (typeof value === 'string') {
      headers.set(name, value);
    }
  }
  if (token) {
    headers.set('authorization', `Bearer ${token}`);
  }
  return headers;
}

function hasBody(req: Request): boolean {
  return (
    !['GET', 'HEAD'].includes(req.method) &&
    Buffer.isBuffer(req.body) &&
    req.body.length > 0
  );
}

function sendProxyError(res: Response, error: unknown): void {
  const timedOut = error instanceof Error && error.name === 'TimeoutError';
  const statusCode = timedOut ? 504 : 502;
  const message = timedOut ? 'API did not respond in time' : 'API is unavailable';
  console.error(`[bff] ${message}:`, error);
  res.status(statusCode).json({ statusCode, message });
}

// Moves the token from the login/register body into the cookie.
async function sendWithoutToken(
  res: Response,
  apiResponse: globalThis.Response,
  secureCookie: boolean,
): Promise<void> {
  const { token, ...body } = (await apiResponse.json()) as {
    token?: string;
  };
  if (token) {
    res.setHeader('Set-Cookie', serializeTokenCookie(token, secureCookie));
  }
  res.status(apiResponse.status).json(body);
}
