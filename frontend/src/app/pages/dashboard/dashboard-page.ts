import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../auth.service';
import { FinanceService } from '../../finance.service';
import { ExpenseFormComponent } from '../../components/expense-form/expense-form';
import { ExpenseSectionComponent } from '../../components/expense-section/expense-section';
import { BudgetChartComponent } from '../../components/budget-chart/budget-chart';

type ExpenseSection = 'mandatory' | 'pleasure' | 'variable' | 'investment';
type Recurrence = 'week' | 'month' | 'year';
interface MoneyEntry {
  id: string;
  label: string;
  amount: number;
  recurrence: Recurrence;
  section: ExpenseSection;
}
interface ImportEntry {
  id: string;
  label: string;
  amount: number;
  recurrence: Recurrence;
  section: ExpenseSection;
  category?: string | null;
}

@Component({
  selector: 'app-dashboard-page',
  imports: [RouterLink, ExpenseFormComponent, ExpenseSectionComponent, BudgetChartComponent],
  templateUrl: './dashboard-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
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
  protected readonly editingEntryId = signal<string | null>(null);
  protected readonly importMessage = signal('');
  protected readonly showImportModal = signal(false);
  protected readonly importMode = signal<'recurring' | 'all'>('recurring');
  protected readonly importCandidates = signal<ImportEntry[]>([]);
  protected readonly selectedImportIds = signal<string[]>([]);
  protected readonly currentMonth = signal(new Date().toISOString().slice(0, 7));
  protected readonly totalMandatory = computed(() =>
    this.entries()
      .filter((entry) => entry.section === 'mandatory')
      .reduce((total, entry) => total + entry.amount, 0),
  );
  protected readonly totalPleasure = computed(() =>
    this.entries()
      .filter((entry) => entry.section === 'pleasure')
      .reduce((total, entry) => total + entry.amount, 0),
  );
  protected readonly totalVariable = computed(() =>
    this.entries()
      .filter((entry) => entry.section === 'variable')
      .reduce((total, entry) => total + entry.amount, 0),
  );
  protected readonly totalInvestment = computed(() =>
    this.entries()
      .filter((entry) => entry.section === 'investment')
      .reduce((total, entry) => total + entry.amount, 0),
  );
  protected readonly totalExpenses = computed(
    () =>
      this.totalMandatory() + this.totalVariable() + this.totalPleasure() + this.totalInvestment(),
  );
  protected readonly remaining = computed(() => this.salary() - this.totalExpenses());
  protected readonly mandatoryThreshold = computed(() => this.salary() * 0.5);
  protected readonly mandatoryWarning = computed(
    () => this.salary() > 0 && this.totalMandatory() > this.mandatoryThreshold(),
  );
  protected readonly investRate = computed(() =>
    this.salary() ? Math.max(Math.round((this.remaining() / this.salary()) * 100), 0) : 0,
  );
  protected readonly investmentThreshold = computed(() => this.salary() * 0.1);
  protected readonly investmentWarning = computed(
    () => this.salary() > 0 && this.totalInvestment() <= this.investmentThreshold(),
  );

  constructor() {
    this.loadMonth();
  }

  protected logout() {
    this.auth.logout();
    this.router.navigateByUrl('/auth');
  }
  protected openImportModal(mode: 'recurring' | 'all') {
    this.importMode.set(mode);
    this.selectedImportIds.set([]);
    this.finance.getImportCandidates(mode, this.currentMonth()).subscribe({
      next: ({ entries }) => {
        this.importCandidates.set(
          entries.map((entry) => ({
            id: entry.id,
            label: entry.label,
            amount: Number(entry.amount),
            recurrence: entry.recurrence.toLowerCase() as Recurrence,
            section: entry.section.toLowerCase() as ExpenseSection,
            category: entry.category,
          })),
        );
        this.showImportModal.set(true);
      },
      error: () => this.importMessage.set('Impossible de charger les dépenses du mois précédent'),
    });
  }
  protected closeImportModal() {
    this.showImportModal.set(false);
    this.selectedImportIds.set([]);
  }
  protected toggleImportEntry(id: string) {
    this.selectedImportIds.update((ids) =>
      ids.includes(id) ? ids.filter((current) => current !== id) : [...ids, id],
    );
  }
  protected isImportSelected(id: string) {
    return this.selectedImportIds().includes(id);
  }
  protected selectAllImports() {
    this.selectedImportIds.set(this.importCandidates().map((entry) => entry.id));
  }
  protected importSelectedEntries() {
    const selectedIds = this.selectedImportIds();
    if (!selectedIds.length) return;
    this.finance.importEntries(this.importMode(), selectedIds, this.currentMonth()).subscribe({
      next: ({ month, imported }) => {
        this.applyMonth(month);
        this.closeImportModal();
        this.importMessage.set(`${imported} dépense(s) importée(s)`);
      },
      error: () =>
        this.importMessage.set('Import impossible. Vérifiez que le serveur API est démarré.'),
    });
  }
  protected importSectionLabel(section: ExpenseSection) {
    return {
      mandatory: 'Obligatoire',
      variable: 'Variable',
      pleasure: 'Plaisir',
      investment: 'Investissement',
    }[section];
  }
  protected changeMonth(offset: number) {
    const [year, month] = this.currentMonth().split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1 + offset, 1));
    this.currentMonth.set(date.toISOString().slice(0, 7));
    this.loadMonth();
  }
  protected monthLabel() {
    return new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(
      new Date(`${this.currentMonth()}-01T00:00:00`),
    );
  }
  protected openExpenseForm(section: ExpenseSection) {
    this.editingEntryId.set(null);
    this.formSection.set(section);
    this.showExpenseForm.set(true);
  }
  protected editExpense(entry: MoneyEntry) {
    this.editingEntryId.set(entry.id);
    this.formSection.set(entry.section);
    this.formLabel.set(entry.label);
    this.formAmount.set(entry.amount);
    this.formRecurrence.set(entry.recurrence);
    this.showExpenseForm.set(true);
  }
  protected closeExpenseForm() {
    this.showExpenseForm.set(false);
    this.editingEntryId.set(null);
    this.formLabel.set('');
    this.formAmount.set(null);
    this.formRecurrence.set('month');
  }
  protected updateSalaryDraft(event: Event) {
    const value = Number((event.target as HTMLInputElement).value);
    this.salaryDraft.set(Number.isFinite(value) && value >= 0 ? value : 0);
  }
  protected saveSalary() {
    const value = this.salaryDraft();
    if (value > 0 && value !== this.salary())
      this.finance
        .saveSalary(value, this.currentMonth())
        .subscribe({ next: () => this.salary.set(value) });
  }
  protected addExpense() {
    if (!this.formLabel().trim() || !this.formAmount() || this.formAmount()! <= 0) return;
    const draft = {
      label: this.formLabel().trim(),
      amount: this.formAmount()!,
      recurrence: this.formRecurrence(),
      section: this.formSection(),
    };
    const request = this.editingEntryId()
      ? this.finance.updateEntry(this.editingEntryId()!, draft, this.currentMonth())
      : this.finance.addEntry(draft, this.currentMonth());
    request.subscribe({
      next: ({ entry }) => {
        const mapped = {
          id: entry.id,
          label: entry.label,
          amount: Number(entry.amount),
          recurrence: entry.recurrence.toLowerCase() as Recurrence,
          section: entry.section.toLowerCase() as ExpenseSection,
        };
        this.entries.update((entries) =>
          this.editingEntryId()
            ? entries.map((current) => (current.id === mapped.id ? mapped : current))
            : [...entries, mapped],
        );
        this.closeExpenseForm();
      },
    });
  }
  protected removeExpense(id: string) {
    this.finance
      .deleteEntry(id)
      .subscribe({
        next: () => this.entries.update((entries) => entries.filter((entry) => entry.id !== id)),
      });
  }
  protected formatAmount(amount: number) {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount);
  }
  protected recurrenceLabel(recurrence: Recurrence) {
    return { week: 'semaine', month: 'mois', year: 'année' }[recurrence];
  }

  private loadMonth() {
    this.finance
      .getMonth(this.currentMonth())
      .subscribe({
        next: ({ month }) => this.applyMonth(month),
        error: () => this.router.navigateByUrl('/auth'),
      });
  }
  private applyMonth(month: {
    entries: Array<{
      id: string;
      label: string;
      amount: string | number;
      recurrence: string;
      section: string;
      type: string;
    }>;
  }) {
    const salary = month.entries.find((entry) => entry.type === 'INCOME');
    const amount = salary ? Number(salary.amount) : 0;
    this.salary.set(amount);
    this.salaryDraft.set(amount);
    this.entries.set(
      month.entries
        .filter((entry) => entry.type === 'EXPENSE')
        .map((entry) => ({
          id: entry.id,
          label: entry.label,
          amount: Number(entry.amount),
          recurrence: entry.recurrence.toLowerCase() as Recurrence,
          section: entry.section.toLowerCase() as ExpenseSection,
        })),
    );
  }
}
