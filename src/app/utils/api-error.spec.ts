import { HttpErrorResponse } from '@angular/common/http';
import { apiErrorMessage, LibraryError } from './api-error';

describe('apiErrorMessage', () => {
  const httpError = (status: number, message?: unknown) =>
    new HttpErrorResponse({ status, error: message ? { message } : null });

  it('should prefer the per status message', () => {
    expect(apiErrorMessage(httpError(401), { 401: 'Nope' })).toBe('Nope');
  });

  it('should show readable API messages', () => {
    expect(apiErrorMessage(httpError(409, 'A list named "Fun" exists'))).toBe(
      'A list named "Fun" exists'
    );
    expect(apiErrorMessage(httpError(400, ['a', 'b']))).toBe('a. b');
  });

  it('should handle server and front errors', () => {
    expect(apiErrorMessage(httpError(502))).toContain('not available');
    expect(apiErrorMessage(new LibraryError('Too many lists'))).toBe('Too many lists');
  });
});
