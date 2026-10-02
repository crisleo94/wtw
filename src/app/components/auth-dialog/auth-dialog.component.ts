import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { TranslocoPipe } from '@jsverse/transloco';
import { Observable } from 'rxjs';
import { User } from '../../interfaces/user.interface';
import { AuthStore } from '../../stores/auth.store';
import { apiErrorMessage } from '../../utils/api-error';

export type AuthDialogResult = 'authenticated' | 'guest';

export interface AuthDialogData {
  reason?: string;
  tab?: 'login' | 'register';
}

export const PASSWORD_MIN_LENGTH = 8;
// Angular's email validator accepts `a@b`; the API requires a domain with a TLD.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const emailValidators = [
  Validators.required,
  Validators.email,
  Validators.pattern(EMAIL_PATTERN),
];
const PASSWORD_MAX_LENGTH = 72;

@Component({
  selector: 'app-auth-dialog',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatTabsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatProgressBarModule,
    TranslocoPipe,
  ],
  templateUrl: './auth-dialog.component.html',
  styleUrl: './auth-dialog.component.sass',
})
export class AuthDialogComponent {
  private fBuilder = inject(FormBuilder);
  private authStore = inject(AuthStore);
  private dialogRef =
    inject<MatDialogRef<AuthDialogComponent, AuthDialogResult>>(MatDialogRef);
  data = inject<AuthDialogData | null>(MAT_DIALOG_DATA, { optional: true });

  passwordMinLength = PASSWORD_MIN_LENGTH;
  selectedTab = signal(this.data?.tab === 'register' ? 1 : 0);
  isSubmitting = signal(false);
  errorMessage = signal<string | null>(null);

  private passwordValidators = [
    Validators.required,
    Validators.minLength(PASSWORD_MIN_LENGTH),
    Validators.maxLength(PASSWORD_MAX_LENGTH),
  ];

  loginForm = this.fBuilder.nonNullable.group({
    email: ['', emailValidators],
    password: ['', this.passwordValidators],
  });

  registerForm = this.fBuilder.nonNullable.group({
    fullName: [
      '',
      [Validators.required, Validators.minLength(2), Validators.maxLength(100)],
    ],
    email: ['', emailValidators],
    password: ['', this.passwordValidators],
  });

  onTabChange(index: number): void {
    this.selectedTab.set(index);
    this.errorMessage.set(null);
  }

  login(): void {
    this.submit(
      this.loginForm,
      () => this.authStore.login(this.loginForm.getRawValue()),
      { 401: 'Invalid email or password.' }
    );
  }

  register(): void {
    this.submit(
      this.registerForm,
      () => this.authStore.register(this.registerForm.getRawValue()),
      { 409: 'This email is already registered. Try logging in instead.' }
    );
  }

  continueAsGuest(): void {
    this.authStore.continueAsGuest();
    this.dialogRef.close('guest');
  }

  private submit(
    form: typeof this.loginForm | typeof this.registerForm,
    request: () => Observable<User>,
    messages: Record<number, string>
  ): void {
    if (form.invalid) {
      form.markAllAsTouched();
      return;
    }
    // Closing mid request would drop the result while the login still succeeds.
    this.dialogRef.disableClose = true;
    this.isSubmitting.set(true);
    this.errorMessage.set(null);
    request().subscribe({
      next: () => this.dialogRef.close('authenticated'),
      error: (error) => {
        this.dialogRef.disableClose = false;
        this.isSubmitting.set(false);
        this.errorMessage.set(apiErrorMessage(error, messages));
      },
    });
  }
}
