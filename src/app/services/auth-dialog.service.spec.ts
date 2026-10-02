import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
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

  afterEach(() => sessionStorage.removeItem('wtw.guest.v1'));

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

  it('should confirm the guest mode with a message', (done) => {
    dialog.open.and.returnValue({ afterClosed: () => of('guest') } as never);
    const snackBar = TestBed.inject(MatSnackBar);
    spyOn(snackBar, 'open');
    service.open().subscribe((result) => {
      expect(result).toBe('guest');
      expect(snackBar.open).toHaveBeenCalledWith(
        jasmine.stringContaining('browsing as a guest'),
        'OK',
        jasmine.anything()
      );
      done();
    });
  });
});
