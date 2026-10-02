import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { TranslocoService } from '@jsverse/transloco';
import { AuthStore } from '../../stores/auth.store';
import { AuthDialogComponent } from './auth-dialog.component';
import { getTranslocoTestingModule } from '../../testing/transloco-testing';

describe('AuthDialogComponent', () => {
  let component: AuthDialogComponent;
  let fixture: ComponentFixture<AuthDialogComponent>;
  let httpTesting: HttpTestingController;
  let dialogRef: jasmine.SpyObj<MatDialogRef<AuthDialogComponent>>;

  beforeEach(async () => {
    dialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);
    await TestBed.configureTestingModule({
      imports: [AuthDialogComponent, getTranslocoTestingModule()],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: MAT_DIALOG_DATA, useValue: { reason: 'Log in to save' } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AuthDialogComponent);
    component = fixture.componentInstance;
    httpTesting = TestBed.inject(HttpTestingController);
    await fixture.whenStable();
  });

  afterEach(() => sessionStorage.removeItem('wtw.guest.v1'));

  it('should validate email and password length', () => {
    component.loginForm.setValue({ email: 'nope', password: '123' });
    component.login();
    expect(component.loginForm.controls.email.hasError('email')).toBeTrue();
    expect(component.loginForm.controls.password.hasError('minlength')).toBeTrue();
    httpTesting.expectNone('/api/auth/login');
  });

  it('should close as authenticated after login', () => {
    component.loginForm.setValue({ email: 'a@b.co', password: '12345678' });
    component.login();
    httpTesting.expectOne('/api/auth/login').flush({ user: { id: '1' } });
    expect(dialogRef.close).toHaveBeenCalledWith('authenticated');
  });

  it('should show invalid credentials', async () => {
    component.loginForm.setValue({ email: 'a@b.co', password: '12345678' });
    component.login();
    httpTesting
      .expectOne('/api/auth/login')
      .flush({ message: 'Credentials are invalid' }, { status: 401, statusText: 'Unauthorized' });
    await fixture.whenStable();
    expect(component.errorMessage()).toBe('Invalid email or password.');
    expect(fixture.nativeElement.textContent).toContain('Invalid email or password.');
    expect(dialogRef.close).not.toHaveBeenCalled();
  });

  it('should show invalid credentials in Spanish', () => {
    TestBed.inject(TranslocoService).setActiveLang('es');
    component.loginForm.setValue({ email: 'a@b.co', password: '12345678' });
    component.login();
    httpTesting
      .expectOne('/api/auth/login')
      .flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(component.errorMessage()).toBe('Correo o contraseña incorrectos.');
  });

  it('should show an email already used error on register', () => {
    component.registerForm.setValue({
      fullName: 'Ana',
      email: 'a@b.co',
      password: '12345678',
    });
    component.register();
    httpTesting
      .expectOne('/api/auth/register')
      .flush({ message: 'Email is already registered' }, { status: 409, statusText: 'Conflict' });
    expect(component.errorMessage()).toContain('already registered');
  });

  it('should continue as guest', () => {
    component.continueAsGuest();
    expect(TestBed.inject(AuthStore).isGuest()).toBeTrue();
    expect(dialogRef.close).toHaveBeenCalledWith('guest');
  });

  it('should reject emails without a TLD like the API', () => {
    component.loginForm.controls.email.setValue('a@b');
    expect(component.loginForm.controls.email.invalid).toBeTrue();
    component.loginForm.controls.email.setValue('a@b.co');
    expect(component.loginForm.controls.email.valid).toBeTrue();
  });

  it('should not let the dialog close while sending', () => {
    component.loginForm.setValue({ email: 'a@b.co', password: '12345678' });
    component.login();
    expect(dialogRef.disableClose).toBeTrue();
    httpTesting
      .expectOne('/api/auth/login')
      .flush({}, { status: 500, statusText: 'Server Error' });
    expect(dialogRef.disableClose).toBeFalse();
  });
});
