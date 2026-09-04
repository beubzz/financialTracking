import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from './auth.service';
import { FinanceService } from './finance.service';

type ExpenseSection = 'mandatory' | 'pleasure';
type Recurrence = 'week' | 'month' | 'year';

interface MoneyEntry {
  id: string;
  label: string;
  amount: number;
  recurrence: Recurrence;
  section: ExpenseSection;
}

@Component({
  selector: 'app-root',
  imports: [FormsModule, RouterLink],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  private readonly auth = inject(AuthService);
  private readonly finance = inject(FinanceService);
  protected readonly salary = signal(0);
  protected readonly entries = signal<MoneyEntry[]>([]);
  protected readonly loggedIn = signal(this.auth.isLoggedIn());
  protected readonly authMode = signal<'login' | 'register' | 'forgot'>('login');
  protected authEmail = '';
  protected authPassword = '';
  protected authError = '';
  protected authMessage = '';
  protected authBusy = false;
  protected readonly showExpenseForm = signal(false);
  protected readonly totalMandatory = computed(() => this.entries().filter((entry) => entry.section === 'mandatory').reduce((total, entry) => total + entry.amount, 0));
  protected readonly totalPleasure = computed(() => this.entries().filter((entry) => entry.section === 'pleasure').reduce((total, entry) => total + entry.amount, 0));
  protected readonly remaining = computed(() => Math.max(this.salary() - this.totalMandatory() - this.totalPleasure(), 0));
  protected readonly investRate = computed(() => this.salary() ? Math.round((this.remaining() / this.salary()) * 100) : 0);
  protected readonly chartBackground = computed(() => {
    const mandatory = this.salary() ? Math.round((this.totalMandatory() / this.salary()) * 100) : 0;
    const pleasure = this.salary() ? Math.round((this.totalPleasure() / this.salary()) * 100) : 0;
    const mandatoryEnd = mandatory;
    const pleasureEnd = mandatory + pleasure;
    return `conic-gradient(#70bdd2 0 ${mandatoryEnd}%, #d5a66a ${mandatoryEnd}% ${pleasureEnd}%, #82dda9 ${pleasureEnd}% 100%)`;
  });

  protected formLabel = '';
  protected formAmount: number | null = null;
  protected formRecurrence: Recurrence = 'month';
  protected formSection: ExpenseSection = 'mandatory';

  constructor() {
    const verificationToken = new URLSearchParams(window.location.search).get('token');
    if (verificationToken && !this.loggedIn()) this.auth.verifyEmail(verificationToken).subscribe({ next: ({ message }) => this.authMessage = message, error: () => this.authError = 'Ce lien de vérification est invalide ou expiré.' });
    if (this.loggedIn()) this.restoreSession();
  }

  protected submitAuth() {
    this.authBusy = true;
    this.authError = '';
    if (this.authMode() === 'forgot') {
      this.auth.requestPasswordReset(this.authEmail).subscribe({ next: ({ message }) => { this.authMessage = message; this.authBusy = false; }, error: (error) => { this.authError = error.error?.error ?? 'Impossible de contacter le serveur.'; this.authBusy = false; } });
      return;
    }
    const request = this.authMode() === 'login' ? this.auth.login(this.authEmail, this.authPassword) : this.auth.register(this.authEmail, this.authPassword);
    request.subscribe({ next: (response) => { this.auth.saveSession(response); this.loggedIn.set(true); this.authBusy = false; this.loadMonth(); this.authMessage = response.emailVerificationRequired ? 'Un e-mail de vérification a été envoyé.' : ''; }, error: (error) => { this.authError = error.error?.error ?? 'Impossible de contacter le serveur.'; this.authBusy = false; } });
  }

  protected switchAuthMode() { this.authMode.update((mode) => mode === 'login' ? 'register' : 'login'); this.authError = ''; this.authMessage = ''; }
  protected openForgotPassword() { this.authMode.set('forgot'); this.authError = ''; this.authMessage = ''; }

  protected logout() { this.auth.logout(); this.loggedIn.set(false); this.salary.set(0); this.entries.set([]); }

  private restoreSession() { this.auth.restoreSession().subscribe({ next: ({ user }) => { this.auth.user.set(user); this.loadMonth(); }, error: () => this.logout() }); }

  private loadMonth() { this.finance.getMonth().subscribe({ next: ({ month }) => { const salary = month.entries.find((entry) => entry.type === 'INCOME'); this.salary.set(salary ? Number(salary.amount) : 0); this.entries.set(month.entries.filter((entry) => entry.type === 'EXPENSE').map((entry) => ({ id: entry.id, label: entry.label, amount: Number(entry.amount), recurrence: entry.recurrence.toLowerCase() as Recurrence, section: entry.section.toLowerCase() as ExpenseSection }))); } }); }

  protected openExpenseForm(section: ExpenseSection = 'mandatory') {
    this.formSection = section;
    this.showExpenseForm.set(true);
  }

  protected closeExpenseForm() {
    this.showExpenseForm.set(false);
    this.formLabel = '';
    this.formAmount = null;
    this.formRecurrence = 'month';
  }

  protected addExpense() {
    if (!this.formLabel.trim() || !this.formAmount || this.formAmount <= 0) return;
    const draft = { label: this.formLabel.trim(), amount: this.formAmount ?? 0, recurrence: this.formRecurrence, section: this.formSection };
    this.finance.addEntry(draft).subscribe({ next: ({ entry }) => { this.entries.update((entries) => [...entries, { id: entry.id, label: entry.label, amount: Number(entry.amount), recurrence: entry.recurrence.toLowerCase() as Recurrence, section: entry.section.toLowerCase() as ExpenseSection }]); this.closeExpenseForm(); }, error: (error) => this.authError = error.error?.error ?? 'Impossible d’enregistrer cette ligne.' });
  }

  protected removeExpense(id: string) {
    this.finance.deleteEntry(id).subscribe({ next: () => this.entries.update((entries) => entries.filter((entry) => entry.id !== id)) });
  }

  protected saveSalary() {
    const input = document.querySelector<HTMLInputElement>('#salary-input');
    const value = Number(input?.value);
    if (value > 0) this.finance.saveSalary(value).subscribe({ next: () => this.salary.set(value) });
  }

  protected formatAmount(amount: number) {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount);
  }

  protected recurrenceLabel(recurrence: Recurrence) {
    return { week: 'semaine', month: 'mois', year: 'année' }[recurrence];
  }
}
