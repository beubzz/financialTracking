import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../environments/environment';

interface AuthResponse {
  token: string;
  user: { id: string; email: string };
  emailVerificationRequired?: boolean;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  readonly user = signal<{ id: string; email: string } | null>(null);

  /**
   * Authenticates a user with their credentials.
   *
   * @param email The user's email address.
   * @param password The user's password.
   * @returns A promise containing the session token and user details.
   */
  login(email: string, password: string): Promise<AuthResponse> {
    return firstValueFrom(
      this.http.post<AuthResponse>(`${environment.apiUrl}/auth/login`, { email, password }),
    );
  }

  /**
   * Creates a user account with the supplied credentials.
   *
   * @param email The email address to register.
   * @param password The password to associate with the account.
   * @returns A promise containing the new session and user details.
   */
  register(email: string, password: string): Promise<AuthResponse> {
    return firstValueFrom(
      this.http.post<AuthResponse>(`${environment.apiUrl}/auth/register`, { email, password }),
    );
  }

  /**
   * Verifies an email address using the token received by email.
   *
   * @param token The email verification token.
   * @returns A promise containing the verification result message.
   */
  verifyEmail(token: string): Promise<{ message: string }> {
    return firstValueFrom(
      this.http.get<{ message: string }>(
        `${environment.apiUrl}/auth/verify-email?token=${encodeURIComponent(token)}`,
      ),
    );
  }

  /**
   * Requests a password reset email for an address.
   *
   * @param email The email address requesting the reset.
   * @returns A promise containing the API response message.
   */
  requestPasswordReset(email: string): Promise<{ message: string }> {
    return firstValueFrom(
      this.http.post<{ message: string }>(`${environment.apiUrl}/auth/forgot-password`, {
        email,
      }),
    );
  }

  /**
   * Persists an authenticated session locally and updates the current user signal.
   *
   * @param response The authentication response returned by the API.
   * @returns Nothing; the session is stored as a side effect.
   */
  saveSession(response: AuthResponse): void {
    localStorage.setItem('ledgerly_token', response.token);
    this.user.set(response.user);
  }

  /**
   * Loads the currently authenticated user from the backend.
   *
   * @returns A promise containing the restored user profile.
   */
  restoreSession(): Promise<{ user: { id: string; email: string } }> {
    return firstValueFrom(
      this.http.get<{ user: { id: string; email: string } }>(`${environment.apiUrl}/auth/me`),
    );
  }

  /**
   * Clears the local session and current user state.
   *
   * @returns Nothing; local storage and the user signal are updated as side effects.
   */
  logout(): void {
    localStorage.removeItem('ledgerly_token');
    this.user.set(null);
  }

  /**
   * Determines whether a session token is currently stored.
   *
   * @returns True when a local authentication token exists.
   */
  isLoggedIn(): boolean {
    return Boolean(localStorage.getItem('ledgerly_token'));
  }
}
