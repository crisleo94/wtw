import { HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';

// Errors raised by the front itself (e.g. session limits) with a user facing message.
export class LibraryError extends Error {
  override name = 'LibraryError';
}

// Nest errors carry `message` as a string or a list of validation messages.
export function apiErrorMessage(
  error: unknown,
  byStatus: Record<number, string> = {},
  transloco?: TranslocoService
): string {
  const translate = transloco || inject(TranslocoService);
  if (error instanceof LibraryError) {
    return error.message;
  }
  if (!(error instanceof HttpErrorResponse)) {
    return translate.translate('errors.generic');
  }
  if (byStatus[error.status]) {
    return byStatus[error.status];
  }
  const message = error.error?.message;
  if ([400, 404, 409].includes(error.status) && message) {
    return Array.isArray(message) ? message.join('. ') : String(message);
  }
  return error.status >= 500 || error.status === 0
    ? translate.translate('errors.serverUnavailable')
    : translate.translate('errors.generic');
}
