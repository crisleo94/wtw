import { PlatformLocation } from '@angular/common';
import {
  FetchBackend,
  HttpErrorResponse,
  HttpEvent,
  HttpRequest,
} from '@angular/common/http';
import { inject, Injectable, InjectionToken } from '@angular/core';
import { catchError, Observable, throwError, timeout, TimeoutError } from 'rxjs';
import { API_URL } from '../constants';

// Where the SSR reaches its own BFF (never the public domain: hairpin NAT hangs).
export const SSR_INTERNAL_ORIGIN = new InjectionToken<string>('SSR_INTERNAL_ORIGIN');
// A slow API must not hold the page: on timeout the browser loads the data itself.
export const SSR_API_TIMEOUT_MS = new InjectionToken<number>('SSR_API_TIMEOUT_MS', {
  factory: () => 3000,
});

// Last step of the server HTTP chain: the transfer cache already keyed the request
// with its original URL, and Angular made it absolute with the public origin.
@Injectable()
export class InternalApiBackend extends FetchBackend {
  private internalOrigin = inject(SSR_INTERNAL_ORIGIN);
  private timeoutMs = inject(SSR_API_TIMEOUT_MS);
  private location = inject(PlatformLocation);

  override handle(request: HttpRequest<unknown>): Observable<HttpEvent<unknown>> {
    const url = toInternalUrl(request.url, this.publicOrigin(), this.internalOrigin);
    if (url === request.url) {
      return super.handle(request);
    }
    return super.handle(request.clone({ url })).pipe(
      timeout(this.timeoutMs),
      catchError((error) =>
        throwError(() =>
          error instanceof TimeoutError
            ? new HttpErrorResponse({ url, status: 504, statusText: 'SSR API timeout' })
            : error
        )
      )
    );
  }

  // Same origin Angular uses to resolve relative URLs on the server.
  private publicOrigin(): string | null {
    const { protocol, hostname, port } = this.location;
    if (!protocol.startsWith('http')) {
      return null;
    }
    return `${protocol}//${hostname}${port ? `:${port}` : ''}`;
  }
}

// Rewrites `/api/...` (relative or on the public origin) to the internal origin.
export function toInternalUrl(url: string, publicOrigin: string | null, internalOrigin: string): string {
  const base = publicOrigin ?? internalOrigin;
  const parsed = new URL(url, base);
  const sameOrigin = !/^[a-z][a-z0-9+.-]*:/i.test(url.trim()) || parsed.origin === new URL(base).origin;
  if (!sameOrigin || !parsed.pathname.startsWith(`${API_URL}/`)) {
    return url;
  }
  return new URL(`${parsed.pathname}${parsed.search}`, internalOrigin).toString();
}
