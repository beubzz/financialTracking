import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../auth.service';

@Component({
  selector: 'app-auth-page',
  imports: [FormsModule],
  templateUrl: './auth-page.html',
  styleUrl: './auth-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  protected readonly mode = signal<'login' | 'register' | 'forgot'>('login');
  protected readonly email = signal('');
  protected readonly password = signal('');
  protected readonly error = signal('');
  protected readonly message = signal('');
  protected readonly busy = signal(false);

  /**
   * Reads a verification token from the URL and verifies it when present.
   *
   * @returns Nothing; verification state is updated through component signals.
   */
  constructor() {
    const token = new URLSearchParams(window.location.search).get('token');
    if (token) void this.verifyEmailToken(token);
  }

  /**
   * Verifies a token found in the current URL.
   *
   * @param token The email verification token to validate.
   * @returns A promise that resolves after the verification state is updated.
   */
  private async verifyEmailToken(token: string): Promise<void> {
    try {
      const { message } = await this.auth.verifyEmail(token);
      this.message.set(message);
    } catch {
      this.error.set('Ce lien de vérification est invalide ou expiré.');
    }
  }

  /**
   * Submits the active authentication flow.
   *
   * @returns Nothing; the selected API request updates authentication state asynchronously.
   */
  protected async submit(): Promise<void> {
    this.busy.set(true);
    this.error.set('');
    if (this.mode() === 'forgot') {
      try {
        const { message } = await this.auth.requestPasswordReset(this.email());
        this.message.set(message);
      } catch (error) {
        this.handleError(error as { status: number; error?: { error?: string } });
      } finally {
        this.busy.set(false);
      }
      return;
    }
    try {
      const response =
        this.mode() === 'login'
          ? await this.auth.login(this.email(), this.password())
          : await this.auth.register(this.email(), this.password());
      this.auth.saveSession(response);
      await this.router.navigateByUrl('/dashboard');
    } catch (error) {
      this.handleError(error as { status: number; error?: { error?: string } });
    } finally {
      this.busy.set(false);
    }
  }

  /**
   * Switches between login and registration mode.
   *
   * @returns Nothing; mode and transient messages are reset.
   */
  protected switchMode(): void {
    this.mode.update((mode) => (mode === 'login' ? 'register' : 'login'));
    this.error.set('');
    this.message.set('');
  }

  /**
   * Opens password reset mode and clears previous messages.
   *
   * @returns Nothing; the active mode and messages are updated.
   */
  protected openForgot(): void {
    this.mode.set('forgot');
    this.error.set('');
    this.message.set('');
  }

  /**
   * Maps an HTTP authentication error to a localized display message.
   *
   * @param error The HTTP error response returned by the API client.
   * @returns Nothing; the error and loading signals are updated.
   */
  private handleError(error: { status: number; error?: { error?: string } }): void {
    this.error.set(
      error.status === 0
        ? 'API inaccessible. Vérifie que le backend tourne sur le port 3000.'
        : (error.error?.error ?? 'Impossible de contacter le serveur.'),
    );
    this.busy.set(false);
  }
}
