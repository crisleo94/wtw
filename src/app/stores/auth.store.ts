import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { catchError, map, Observable, of, tap } from 'rxjs';
import { API_URL } from '../constants';
import {
  LoginCredentials,
  RegisterData,
  User,
} from '../interfaces/user.interface';
import {
  injectLocalStorage,
  injectSessionStorage,
  onStorageChange,
} from '../utils/browser-storage';
import {
  GUEST_ACTIVE_KEY,
  GUEST_KEY,
  isGuestExpired,
  REJECTED_KEY,
  SESSION_KEY,
} from './guest-storage';

interface AuthResponse {
  user: User;
}

@Injectable({
  providedIn: 'root',
})
export class AuthStore {
  private http = inject(HttpClient);
  private local = injectLocalStorage();
  private session = injectSessionStorage();
  private currentUser = signal<User | null>(null);
  // Guest mode lives in localStorage so it survives closing the tab or the browser.
  private guest = signal(this.readGuest());

  readonly user = this.currentUser.asReadonly();
  readonly isLoggedIn = computed(() => this.currentUser() !== null);
  readonly isGuest = this.guest.asReadonly();

  constructor() {
    onStorageChange(GUEST_KEY, (value) => this.guest.set(value === 'true'));
  }

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
    this.local.set(GUEST_KEY, 'true');
    this.local.set(GUEST_ACTIVE_KEY, String(Date.now()));
  }

  // Older builds kept the flag in sessionStorage; expired guest data is dropped.
  private readGuest(): boolean {
    if (this.session.get(GUEST_KEY) === 'true') {
      this.session.remove(GUEST_KEY);
      this.local.set(GUEST_KEY, 'true');
      this.local.set(GUEST_ACTIVE_KEY, String(Date.now()));
    }
    if (this.local.get(GUEST_KEY) !== 'true') {
      return false;
    }
    if (isGuestExpired(this.local.get(GUEST_ACTIVE_KEY))) {
      for (const key of [GUEST_KEY, GUEST_ACTIVE_KEY, SESSION_KEY, REJECTED_KEY]) {
        this.local.remove(key);
      }
      return false;
    }
    return true;
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
        this.local.remove(GUEST_KEY);
        this.local.remove(GUEST_ACTIVE_KEY);
      })
    );
  }
}
