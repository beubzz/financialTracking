import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../auth.service';
import { FinanceService } from '../../finance.service';
import { ExpenseFormComponent } from '../../components/expense-form/expense-form';
import { ExpenseSectionComponent } from '../../components/expense-section/expense-section';
import { BudgetChartComponent } from '../../components/budget-chart/budget-chart';
import { AppLayoutComponent } from '../../components/app-layout/app-layout';
import {
  LucideChevronDown,
  LucideChevronLeft,
  LucideChevronRight,
  LucideUpload,
  LucideWallet,
} from '@lucide/angular';

type ExpenseSection = 'mandatory' | 'pleasure' | 'variable' | 'investment';
type Recurrence = 'unique' | 'week' | 'month' | 'year';
interface MoneyEntry {
  id: string;
  label: string;
  amount: number;
  recurrence: Recurrence;
  section: ExpenseSection;
  parentId?: string | null;
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
  imports: [
    AppLayoutComponent,
    ExpenseFormComponent,
    ExpenseSectionComponent,
    BudgetChartComponent,
    LucideChevronDown,
    LucideChevronLeft,
    LucideChevronRight,
    LucideUpload,
    LucideWallet,
  ],
  templateUrl: './dashboard-page.html',
  styleUrl: './dashboard-page.scss',
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
  protected readonly formParentId = signal<string | null>(null);
  protected readonly formParentLabel = signal<string | null>(null);
  protected readonly formError = signal('');
  protected readonly formSubmitting = signal(false);
  protected readonly longTermCollapsed = signal(false);
  /** Returns selectable top-level entries for variable and pleasure subentries. */
  protected readonly parentOptions = computed(() =>
    this.entries()
      .filter(
        (entry) =>
          (this.formSection() === 'variable' || this.formSection() === 'pleasure') &&
          entry.section === this.formSection() &&
          !entry.parentId &&
          entry.id !== this.editingEntryId(),
      )
      .map((entry) => ({ id: entry.id, label: entry.label })),
  );
  protected readonly currentMonth = signal(new Date().toISOString().slice(0, 7));
  /** Calculates the total mandatory expenses. */
  protected readonly totalMandatory = computed(() =>
    this.entries()
      .filter((entry) => entry.section === 'mandatory')
      .reduce((total, entry) => total + entry.amount, 0),
  );
  /** Calculates the total pleasure expenses. */
  protected readonly totalPleasure = computed(() => this.sectionTotal('pleasure'));

  /** Calculates the total variable expenses. */
  protected readonly totalVariable = computed(() => this.sectionTotal('variable'));

  /** Calculates the total investment expenses. */
  protected readonly totalInvestment = computed(() =>
    this.entries()
      .filter((entry) => entry.section === 'investment')
      .reduce((total, entry) => total + entry.amount, 0),
  );
  /** Calculates all expenses across every budget section. */
  protected readonly totalExpenses = computed(
    () =>
      this.totalMandatory() + this.totalVariable() + this.totalPleasure() + this.totalInvestment(),
  );
  /** Calculates the amount remaining after planned expenses. */
  protected readonly remaining = computed(() => this.salary() - this.totalExpenses());

  /** Calculates the maximum recommended mandatory expense threshold. */
  protected readonly mandatoryThreshold = computed(() => this.salary() * 0.5);

  /** Indicates whether mandatory expenses exceed half of the salary. */
  protected readonly mandatoryWarning = computed(
    () => this.salary() > 0 && this.totalMandatory() > this.mandatoryThreshold(),
  );
  /** Calculates the percentage of salary remaining for investment or savings. */
  protected readonly investRate = computed(() =>
    this.salary() ? Math.max(Math.round((this.remaining() / this.salary()) * 100), 0) : 0,
  );
  /** Calculates the recommended minimum investment threshold. */
  protected readonly investmentThreshold = computed(() => this.salary() * 0.1);

  /** Indicates whether investment is at or below ten percent of salary. */
  protected readonly investmentWarning = computed(
    () => this.salary() > 0 && this.totalInvestment() <= this.investmentThreshold(),
  );

  /**
   * Loads the current financial month when the dashboard is created.
   *
   * @returns Nothing; the initial finance request starts as a side effect.
   */
  constructor() {
    this.loadMonth();
  }

  /**
   * Clears the local session and redirects to authentication.
   *
   * @returns Nothing; logout and navigation occur as side effects.
   */
  protected logout(): void {
    this.auth.logout();
    this.router.navigateByUrl('/auth');
  }
  /**
   * Toggles the long-term investment card visibility.
   *
   * @returns Nothing; the collapsed signal is updated.
   */
  protected toggleLongTerm(): void {
    this.longTermCollapsed.update((value) => !value);
  }
  /**
   * Loads import candidates and opens the import modal.
   *
   * @param mode Whether recurring entries or all expenses should be imported.
   * @returns Nothing; candidates and modal state are updated asynchronously.
   */
  protected async openImportModal(mode: 'recurring' | 'all'): Promise<void> {
    this.importMode.set(mode);
    this.selectedImportIds.set([]);
    try {
      const { entries } = await this.finance.getImportCandidates(mode, this.currentMonth());
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
    } catch {
      this.importMessage.set('Impossible de charger les dépenses du mois précédent');
    }
  }
  /**
   * Closes the import modal and clears the current selection.
   *
   * @returns Nothing; import modal state is reset.
   */
  protected closeImportModal(): void {
    this.showImportModal.set(false);
    this.selectedImportIds.set([]);
  }
  /**
   * Toggles one import candidate in the selected identifiers list.
   *
   * @param id The candidate identifier to toggle.
   * @returns Nothing; the selected identifiers signal is updated.
   */
  protected toggleImportEntry(id: string): void {
    this.selectedImportIds.update((ids) =>
      ids.includes(id) ? ids.filter((current) => current !== id) : [...ids, id],
    );
  }
  /**
   * Checks whether an import candidate is selected.
   *
   * @param id The candidate identifier to inspect.
   * @returns True when the candidate is currently selected.
   */
  protected isImportSelected(id: string): boolean {
    return this.selectedImportIds().includes(id);
  }
  /**
   * Selects every currently loaded import candidate.
   *
   * @returns Nothing; the selected identifiers signal is replaced.
   */
  protected selectAllImports(): void {
    this.selectedImportIds.set(this.importCandidates().map((entry) => entry.id));
  }
  /**
   * Imports the currently selected candidates into the active month.
   *
   * @returns Nothing; the import request starts when at least one item is selected.
   */
  protected async importSelectedEntries(): Promise<void> {
    const selectedIds = this.selectedImportIds();
    if (!selectedIds.length) return;
    try {
      const { month, imported } = await this.finance.importEntries(
        this.importMode(),
        selectedIds,
        this.currentMonth(),
      );
      this.applyMonth(month);
      this.closeImportModal();
      this.importMessage.set(`${imported} dépense(s) importée(s)`);
    } catch {
      this.importMessage.set('Import impossible. Vérifiez que le serveur API est démarré.');
    }
  }
  /**
   * Converts a section code into the label shown in the import modal.
   *
   * @param section The internal expense section.
   * @returns The localized section label.
   */
  protected importSectionLabel(section: ExpenseSection): string {
    return {
      mandatory: 'Obligatoire',
      variable: 'Variable',
      pleasure: 'Plaisir',
      investment: 'Investissement',
    }[section];
  }
  /**
   * Moves the dashboard to another calendar month.
   *
   * @param offset The number of months to move forward or backward.
   * @returns Nothing; the month signal changes and data is reloaded.
   */
  protected changeMonth(offset: number): void {
    const [year, month] = this.currentMonth().split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1 + offset, 1));
    this.currentMonth.set(date.toISOString().slice(0, 7));
    this.loadMonth();
  }
  /**
   * Formats the active month for display.
   *
   * @returns The localized month and year label.
   */
  protected monthLabel(): string {
    return new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(
      new Date(`${this.currentMonth()}-01T00:00:00`),
    );
  }
  /**
   * Opens a form for creating a top-level expense.
   *
   * @param section The section that will receive the new expense.
   * @returns Nothing; the form state is initialized.
   */
  protected openExpenseForm(section: ExpenseSection): void {
    this.editingEntryId.set(null);
    this.formSection.set(section);
    this.formLabel.set('');
    this.formAmount.set(null);
    this.formRecurrence.set('month');
    this.formParentId.set(null);
    this.formParentLabel.set(null);
    this.formError.set('');
    this.formSubmitting.set(false);
    this.showExpenseForm.set(true);
  }
  /**
   * Opens a form for creating a child expense under a parent.
   *
   * @param parent The entry that will own the new subentry.
   * @returns Nothing; the form state is initialized with the parent.
   */
  protected openSubentryForm(parent: MoneyEntry): void {
    this.editingEntryId.set(null);
    this.formSection.set(parent.section);
    this.formLabel.set('');
    this.formAmount.set(null);
    this.formRecurrence.set('month');
    this.formParentId.set(parent.id);
    this.formParentLabel.set(parent.label);
    this.formError.set('');
    this.formSubmitting.set(false);
    this.showExpenseForm.set(true);
  }
  /**
   * Opens the form with an existing expense for editing.
   *
   * @param entry The expense to edit.
   * @returns Nothing; the form state is populated from the entry.
   */
  protected editExpense(entry: MoneyEntry): void {
    this.editingEntryId.set(entry.id);
    this.formSection.set(entry.section);
    this.formLabel.set(entry.label);
    this.formAmount.set(entry.amount);
    this.formRecurrence.set(entry.recurrence);
    this.formParentId.set(entry.parentId ?? null);
    this.formParentLabel.set(
      entry.parentId
        ? (this.entries().find((item) => item.id === entry.parentId)?.label ?? null)
        : null,
    );
    this.formError.set('');
    this.showExpenseForm.set(true);
  }
  /**
   * Closes the expense form and clears its transient state.
   *
   * @returns Nothing; form signals are reset.
   */
  protected closeExpenseForm(): void {
    this.showExpenseForm.set(false);
    this.editingEntryId.set(null);
    this.formLabel.set('');
    this.formAmount.set(null);
    this.formRecurrence.set('month');
    this.formParentId.set(null);
    this.formParentLabel.set(null);
    this.formError.set('');
    this.formSubmitting.set(false);
  }
  /**
   * Updates the salary draft from the salary input event.
   *
   * @param event The input event containing the draft salary value.
   * @returns Nothing; the salary draft signal is updated.
   */
  protected updateSalaryDraft(event: Event): void {
    const value = Number((event.target as HTMLInputElement).value);
    this.salaryDraft.set(Number.isFinite(value) && value >= 0 ? value : 0);
  }
  /**
   * Persists the salary draft when it differs from the current salary.
   *
   * @returns Nothing; a salary update request starts for a valid changed value.
   */
  protected async saveSalary(): Promise<void> {
    const value = this.salaryDraft();
    if (value <= 0 || value === this.salary()) return;
    await this.finance.saveSalary(value, this.currentMonth());
    this.salary.set(value);
  }
  /**
   * Creates or updates the expense represented by the form state.
   *
   * @returns Nothing; the appropriate persistence request starts for valid input.
   */
  protected async addExpense(): Promise<void> {
    if (!this.formLabel().trim() || !this.formAmount() || this.formAmount()! <= 0) return;
    if (this.formSubmitting()) return;
    this.formError.set('');
    this.formSubmitting.set(true);
    const draft = {
      label: this.formLabel().trim(),
      amount: this.formAmount()!,
      recurrence: this.formRecurrence(),
      section: this.formSection(),
      ...(this.formParentId() ? { parentId: this.formParentId()! } : {}),
    };
    const request = this.editingEntryId()
      ? this.finance.updateEntry(this.editingEntryId()!, draft, this.currentMonth())
      : this.finance.addEntry(draft, this.currentMonth());
    try {
      const { entry } = await request;
      const mapped = {
        id: entry.id,
        label: entry.label,
        amount: Number(entry.amount),
        recurrence: entry.recurrence.toLowerCase() as Recurrence,
        section: entry.section.toLowerCase() as ExpenseSection,
        parentId: entry.parentId,
      };
      this.entries.update((entries) =>
        this.editingEntryId()
          ? entries.map((current) => (current.id === mapped.id ? mapped : current))
          : [...entries, mapped],
      );
      this.closeExpenseForm();
    } catch (error) {
      const requestError = error as { status: number; error?: { error?: string } | string };
      this.formError.set(
        requestError.status === 409 &&
          ((typeof requestError.error === 'object' &&
            requestError.error?.error === 'DUPLICATE_ENTRY_LABEL') ||
            requestError.error === 'DUPLICATE_ENTRY_LABEL')
          ? 'Une ligne avec ce titre existe déjà pour ce mois. Choisissez un autre titre.'
          : 'Impossible d’enregistrer cette dépense. Vérifiez que le serveur API est démarré.',
      );
    } finally {
      this.formSubmitting.set(false);
    }
  }
  /**
   * Deletes an expense and any child entries linked to it.
   *
   * @param id The identifier of the expense to delete.
   * @returns Nothing; the delete request updates local state asynchronously.
   */
  protected async removeExpense(id: string): Promise<void> {
    await this.finance.deleteEntry(id);
    this.entries.update((entries) =>
      entries.filter((entry) => entry.id !== id && entry.parentId !== id),
    );
  }
  /**
   * Formats a dashboard amount using the French euro currency format.
   *
   * @param amount The numeric amount to format.
   * @returns The localized euro amount.
   */
  protected formatAmount(amount: number): string {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount);
  }
  /**
   * Converts an internal recurrence code into a French display label.
   *
   * @param recurrence The recurrence value to translate.
   * @returns The localized recurrence label.
   */
  protected recurrenceLabel(recurrence: Recurrence): string {
    return { unique: 'unique', week: 'semaine', month: 'mois', year: 'année' }[recurrence];
  }
  /**
   * Calculates a section total using child totals when children exist.
   *
   * @param section The expense section to total.
   * @returns The calculated amount for the section.
   */
  private sectionTotal(section: ExpenseSection): number {
    const parents = this.entries().filter((entry) => entry.section === section && !entry.parentId);
    return parents.reduce((total, entry) => {
      const children = this.entries().filter((child) => child.parentId === entry.id);
      return (
        total +
        (children.length ? children.reduce((sum, child) => sum + child.amount, 0) : entry.amount)
      );
    }, 0);
  }

  /**
   * Loads the active month and redirects when the API request is unauthorized.
   *
   * @returns Nothing; the month request starts asynchronously.
   */
  private async loadMonth(): Promise<void> {
    try {
      const { month } = await this.finance.getMonth(this.currentMonth());
      this.applyMonth(month);
    } catch {
      await this.router.navigateByUrl('/auth');
    }
  }
  /**
   * Maps the API month payload into the dashboard signals.
   *
   * @param month The month payload returned by the finance API.
   * @returns Nothing; salary and expense signals are replaced.
   */
  private applyMonth(month: {
    entries: Array<{
      id: string;
      label: string;
      amount: string | number;
      recurrence: string;
      section: string;
      type: string;
      parentId?: string | null;
    }>;
  }): void {
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
          parentId: entry.parentId,
        })),
    );
  }
}
