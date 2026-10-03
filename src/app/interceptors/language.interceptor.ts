import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { API_URL } from '../constants';
import { LanguageStore } from '../stores/language.store';

// The API asks TMDB for titles, synopses and genres in this language.
export const languageInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(`${API_URL}/`)) {
    return next(req);
  }
  const lang = inject(LanguageStore).lang();
  return next(req.clone({ setHeaders: { 'Accept-Language': lang } }));
};
