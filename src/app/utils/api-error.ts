import { HttpErrorResponse } from '@angular/common/http';
import { TranslocoService } from '@jsverse/transloco';

// Errors raised by the front itself (e.g. session limits) with a user facing message.
export class LibraryError extends Error {
  override name = 'LibraryError';
}

// Nest errors carry `message` as a string or a list of validation messages.
export function apiErrorMessage(
  error: unknown,
  transloco: TranslocoService,
  byStatus: Record<number, string> = {}
): string {
  if (error instanceof LibraryError) {
    return error.message;
  }
  if (!(error instanceof HttpErrorResponse)) {
    return transloco.translate('errors.generic');
  }
  if (byStatus[error.status]) {
    return byStatus[error.status];
  }
  const message = error.error?.message;
  if ([400, 404, 409].includes(error.status) && message) {
    return Array.isArray(message) ? message.join('. ') : String(message);
  }
  return error.status >= 500 || error.status === 0
    ? transloco.translate('errors.serverUnavailable')
    : transloco.translate('errors.generic');
}
