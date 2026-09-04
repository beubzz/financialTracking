import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../auth.service';

@Component({
  selector: 'app-auth-page',
  imports: [FormsModule],
  templateUrl: './auth-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush
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

  constructor() {
    const token = new URLSearchParams(window.location.search).get('token');
    if (token) this.auth.verifyEmail(token).subscribe({ next: ({ message }) => this.message.set(message), error: () => this.error.set('Ce lien de vérification est invalide ou expiré.') });
  }

  protected submit() {
    this.busy.set(true);
    this.error.set('');
    if (this.mode() === 'forgot') {
      this.auth.requestPasswordReset(this.email()).subscribe({ next: ({ message }) => { this.message.set(message); this.busy.set(false); }, error: (error) => this.handleError(error) });
      return;
    }
    const request = this.mode() === 'login' ? this.auth.login(this.email(), this.password()) : this.auth.register(this.email(), this.password());
    request.subscribe({ next: (response) => { this.auth.saveSession(response); this.busy.set(false); this.router.navigateByUrl('/dashboard'); }, error: (error) => this.handleError(error) });
  }

  protected switchMode() { this.mode.update((mode) => mode === 'login' ? 'register' : 'login'); this.error.set(''); this.message.set(''); }
  protected openForgot() { this.mode.set('forgot'); this.error.set(''); this.message.set(''); }

  private handleError(error: { status: number; error?: { error?: string } }) {
    this.error.set(error.status === 0 ? 'API inaccessible. Vérifie que le backend tourne sur le port 3000.' : (error.error?.error ?? 'Impossible de contacter le serveur.'));
    this.busy.set(false);
  }
}
