import { HttpInterceptorFn } from '@angular/common/http';
import { inject, REQUEST } from '@angular/core';
import { API_URL } from '../constants';

// During SSR the BFF needs the browser cookie; InternalApiBackend picks the origin.
export const apiInterceptor: HttpInterceptorFn = (req, next) => {
  const cookie = inject(REQUEST, { optional: true })?.headers.get('cookie');
  if (!cookie || !req.url.startsWith(`${API_URL}/`)) {
    return next(req);
  }

  return next(req.clone({ setHeaders: { cookie } }));
};
