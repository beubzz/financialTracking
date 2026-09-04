import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../auth.service';
import { FinanceService } from '../../finance.service';
import { ExpenseFormComponent } from '../../components/expense-form/expense-form';
import { ExpenseSectionComponent } from '../../components/expense-section/expense-section';
import { BudgetChartComponent } from '../../components/budget-chart/budget-chart';

type ExpenseSection = 'mandatory' | 'pleasure' | 'variable';
type Recurrence = 'week' | 'month' | 'year';
interface MoneyEntry { id: string; label: string; amount: number; recurrence: Recurrence; section: ExpenseSection; }

@Component({
  selector: 'app-dashboard-page',
  imports: [RouterLink, ExpenseFormComponent, ExpenseSectionComponent, BudgetChartComponent],
  templateUrl: './dashboard-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardPage {
  private readonly auth = inject(AuthService);
  private readonly finance = inject(FinanceService);
  private readonly router = inject(Router);
  protected readonly salary = signal(0);
  protected readonly salaryDraft = signal(0);
  protected readonly entries = signal<MoneyEntry[]>([]);
  protected readonly showExpenseForm = signal(false);
  protected readonly formLabel = signal('');
  protected readonly formAmount = signal<number | null>(null);
  protected readonly formRecurrence = signal<Recurrence>('month');
  protected readonly formSection = signal<ExpenseSection>('mandatory');
  protected readonly totalMandatory = computed(() => this.entries().filter((entry) => entry.section === 'mandatory').reduce((total, entry) => total + entry.amount, 0));
  protected readonly totalPleasure = computed(() => this.entries().filter((entry) => entry.section === 'pleasure').reduce((total, entry) => total + entry.amount, 0));
  protected readonly totalVariable = computed(() => this.entries().filter((entry) => entry.section === 'variable').reduce((total, entry) => total + entry.amount, 0));
  protected readonly totalExpenses = computed(() => this.totalMandatory() + this.totalVariable() + this.totalPleasure());
  protected readonly remaining = computed(() => this.salary() - this.totalExpenses());
  protected readonly investRate = computed(() => this.salary() ? Math.max(Math.round((this.remaining() / this.salary()) * 100), 0) : 0);

  constructor() { this.loadMonth(); }

  protected logout() { this.auth.logout(); this.router.navigateByUrl('/auth'); }
  protected openExpenseForm(section: ExpenseSection) { this.formSection.set(section); this.showExpenseForm.set(true); }
  protected closeExpenseForm() { this.showExpenseForm.set(false); this.formLabel.set(''); this.formAmount.set(null); this.formRecurrence.set('month'); }
  protected updateSalaryDraft(event: Event) { const value = Number((event.target as HTMLInputElement).value); this.salaryDraft.set(Number.isFinite(value) && value >= 0 ? value : 0); }
  protected saveSalary() { const value = this.salaryDraft(); if (value > 0 && value !== this.salary()) this.finance.saveSalary(value).subscribe({ next: () => this.salary.set(value) }); }
  protected addExpense() { if (!this.formLabel().trim() || !this.formAmount() || this.formAmount()! <= 0) return; const draft = { label: this.formLabel().trim(), amount: this.formAmount()!, recurrence: this.formRecurrence(), section: this.formSection() }; this.finance.addEntry(draft).subscribe({ next: ({ entry }) => { this.entries.update((entries) => [...entries, { id: entry.id, label: entry.label, amount: Number(entry.amount), recurrence: entry.recurrence.toLowerCase() as Recurrence, section: entry.section.toLowerCase() as ExpenseSection }]); this.closeExpenseForm(); } }); }
  protected removeExpense(id: string) { this.finance.deleteEntry(id).subscribe({ next: () => this.entries.update((entries) => entries.filter((entry) => entry.id !== id)) }); }
  protected formatAmount(amount: number) { return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount); }
  protected recurrenceLabel(recurrence: Recurrence) { return { week: 'semaine', month: 'mois', year: 'année' }[recurrence]; }

  private loadMonth() { this.finance.getMonth().subscribe({ next: ({ month }) => { const salary = month.entries.find((entry) => entry.type === 'INCOME'); const amount = salary ? Number(salary.amount) : 0; this.salary.set(amount); this.salaryDraft.set(amount); this.entries.set(month.entries.filter((entry) => entry.type === 'EXPENSE').map((entry) => ({ id: entry.id, label: entry.label, amount: Number(entry.amount), recurrence: entry.recurrence.toLowerCase() as Recurrence, section: entry.section.toLowerCase() as ExpenseSection }))); }, error: () => this.router.navigateByUrl('/auth') }); }
}
