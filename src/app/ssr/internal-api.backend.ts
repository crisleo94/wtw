import { PlatformLocation } from '@angular/common';
import { FetchBackend, HttpEvent, HttpRequest } from '@angular/common/http';
import { inject, Injectable, InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import { API_URL } from '../constants';

// Where the SSR reaches its own BFF (never the public domain: hairpin NAT hangs).
export const SSR_INTERNAL_ORIGIN = new InjectionToken<string>('SSR_INTERNAL_ORIGIN');

// Last step of the server HTTP chain: the transfer cache already keyed the request
// with its original URL, and Angular made it absolute with the public origin.
@Injectable()
export class InternalApiBackend extends FetchBackend {
  private internalOrigin = inject(SSR_INTERNAL_ORIGIN);
  private location = inject(PlatformLocation);

  override handle(request: HttpRequest<unknown>): Observable<HttpEvent<unknown>> {
    const url = toInternalUrl(request.url, this.publicOrigin(), this.internalOrigin);
    return super.handle(url === request.url ? request : request.clone({ url }));
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
