import { HttpErrorResponse } from '@angular/common/http';

const GENERIC_MESSAGE = 'Something went wrong. Please try again.';
const READABLE_STATUSES = [400, 404, 409];

// Errors raised by the front itself (e.g. session limits) with a user facing message.
export class LibraryError extends Error {
  override name = 'LibraryError';
}

// Nest errors carry `message` as a string or a list of validation messages.
export function apiErrorMessage(
  error: unknown,
  byStatus: Record<number, string> = {}
): string {
  if (error instanceof LibraryError) {
    return error.message;
  }
  if (!(error instanceof HttpErrorResponse)) {
    return GENERIC_MESSAGE;
  }
  if (byStatus[error.status]) {
    return byStatus[error.status];
  }
  const message = error.error?.message;
  if (READABLE_STATUSES.includes(error.status) && message) {
    return Array.isArray(message) ? message.join('. ') : String(message);
  }
  return error.status >= 500 || error.status === 0
    ? 'The server is not available right now. Please try again.'
    : GENERIC_MESSAGE;
}
