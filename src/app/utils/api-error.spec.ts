import { HttpErrorResponse } from '@angular/common/http';
import { TranslocoService } from '@jsverse/transloco';
import { apiErrorMessage, LibraryError } from './api-error';

describe('apiErrorMessage', () => {
  const httpError = (status: number, message?: unknown) =>
    new HttpErrorResponse({ status, error: message ? { message } : null });

  const mockTransloco = {
    translate: (key: string) => {
      const messages: Record<string, string> = {
        'errors.generic': 'Something went wrong. Try again.',
        'errors.serverUnavailable': 'The server is not available right now. Try again.',
        'errors.sessionExpired': 'Your session expired. Please log in again.',
      };
      return messages[key] || key;
    },
  } as unknown as TranslocoService;

  it('should prefer the per status message', () => {
    expect(apiErrorMessage(httpError(401), mockTransloco, { 401: 'Nope' })).toBe('Nope');
  });

  it('should show readable API messages', () => {
    expect(apiErrorMessage(httpError(409, 'A list named "Fun" exists'), mockTransloco)).toBe(
      'A list named "Fun" exists'
    );
    expect(apiErrorMessage(httpError(400, ['a', 'b']), mockTransloco)).toBe('a. b');
  });

  it('should handle server and front errors', () => {
    expect(apiErrorMessage(httpError(502), mockTransloco)).toContain('not available');
    expect(apiErrorMessage(new LibraryError('Too many lists'), mockTransloco)).toBe('Too many lists');
  });

  it('should explain an expired session instead of the generic error', () => {
    expect(apiErrorMessage(httpError(401, 'Unauthorized'), mockTransloco)).toBe(
      'Your session expired. Please log in again.'
    );
  });
});
