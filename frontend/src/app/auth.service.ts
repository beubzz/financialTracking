import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
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

  login(email: string, password: string) {
    return this.http.post<AuthResponse>(`${environment.apiUrl}/auth/login`, { email, password });
  }
  register(email: string, password: string) {
    return this.http.post<AuthResponse>(`${environment.apiUrl}/auth/register`, { email, password });
  }
  verifyEmail(token: string) {
    return this.http.get<{ message: string }>(
      `${environment.apiUrl}/auth/verify-email?token=${encodeURIComponent(token)}`,
    );
  }
  requestPasswordReset(email: string) {
    return this.http.post<{ message: string }>(`${environment.apiUrl}/auth/forgot-password`, {
      email,
    });
  }
  saveSession(response: AuthResponse) {
    localStorage.setItem('ledgerly_token', response.token);
    this.user.set(response.user);
  }
  restoreSession() {
    return this.http.get<{ user: { id: string; email: string } }>(`${environment.apiUrl}/auth/me`);
  }
  logout() {
    localStorage.removeItem('ledgerly_token');
    this.user.set(null);
  }
  isLoggedIn() {
    return Boolean(localStorage.getItem('ledgerly_token'));
  }
}
