import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { of } from 'rxjs';
import { AuthStore } from '../stores/auth.store';
import { AuthDialogService } from './auth-dialog.service';

describe('AuthDialogService', () => {
  let service: AuthDialogService;
  let dialog: jasmine.SpyObj<MatDialog>;

  beforeEach(() => {
    dialog = jasmine.createSpyObj('MatDialog', ['open']);
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: MatDialog, useValue: dialog },
      ],
    });
    service = TestBed.inject(AuthDialogService);
  });

  it('should not open the dialog in guest mode', (done) => {
    TestBed.inject(AuthStore).continueAsGuest();
    service.ensureSession('why').subscribe((result) => {
      expect(result).toBe('guest');
      expect(dialog.open).not.toHaveBeenCalled();
      done();
    });
  });

  it('should report authenticated if the dialog closes after a login', (done) => {
    dialog.open.and.returnValue({ afterClosed: () => of(undefined) } as never);
    const authStore = TestBed.inject(AuthStore);
    spyOn(authStore, 'isLoggedIn').and.returnValue(true);
    service.open().subscribe((result) => {
      expect(result).toBe('authenticated');
      done();
    });
  });
});
