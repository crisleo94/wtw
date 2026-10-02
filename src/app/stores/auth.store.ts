import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { catchError, map, Observable, of, tap } from 'rxjs';
import { API_URL } from '../constants';
import {
  LoginCredentials,
  RegisterData,
  User,
} from '../interfaces/user.interface';

interface AuthResponse {
  user: User;
}

@Injectable({
  providedIn: 'root',
})
export class AuthStore {
  private http = inject(HttpClient);
  private currentUser = signal<User | null>(null);
  private guest = signal(false);

  readonly user = this.currentUser.asReadonly();
  readonly isLoggedIn = computed(() => this.currentUser() !== null);
  readonly isGuest = this.guest.asReadonly();

  // Reads the session from the httpOnly cookie through the BFF.
  load(): Observable<User | null> {
    return this.http.get<AuthResponse>(`${API_URL}/auth/me`).pipe(
      map(({ user }) => user),
      catchError(() => of(null)),
      tap((user) => this.currentUser.set(user))
    );
  }

  login(credentials: LoginCredentials): Observable<User> {
    return this.authenticate('login', credentials);
  }

  register(data: RegisterData): Observable<User> {
    return this.authenticate('register', data);
  }

  logout(): Observable<void> {
    return this.http.post<void>(`${API_URL}/auth/logout`, null).pipe(
      tap(() => this.currentUser.set(null))
    );
  }

  clearUser(): void {
    this.currentUser.set(null);
  }

  continueAsGuest(): void {
    this.guest.set(true);
  }

  private authenticate(
    action: 'login' | 'register',
    body: LoginCredentials | RegisterData
  ): Observable<User> {
    return this.http.post<AuthResponse>(`${API_URL}/auth/${action}`, body).pipe(
      map(({ user }) => user),
      tap((user) => {
        this.currentUser.set(user);
        this.guest.set(false);
      })
    );
  }
}
