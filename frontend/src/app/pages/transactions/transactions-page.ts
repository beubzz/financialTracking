import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FinanceService, ApiEntry } from '../../finance.service';
import { AppLayoutComponent } from '../../components/app-layout/app-layout';

@Component({
  selector: 'app-transactions-page',
  imports: [AppLayoutComponent, RouterLink],
  templateUrl: './transactions-page.html',
  styleUrl: './transactions-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TransactionsPage {
  private readonly finance = inject(FinanceService);
  protected readonly entries = signal<ApiEntry[]>([]);
  protected readonly query = signal('');
  protected readonly filter = signal<'all' | 'mandatory' | 'variable' | 'pleasure'>('all');
  protected readonly editingId = signal<string | null>(null);
  protected readonly editingLabel = signal('');
  protected readonly editingAmount = signal<number | null>(null);
  protected readonly currentMonth = new Date().toISOString().slice(0, 7);
  /**
   * Filters entries by the current search query and section filter.
   *
   * @returns The entries matching the active transaction filters.
   */
  protected readonly filteredEntries = (): ApiEntry[] =>
    this.entries().filter(
      (entry) =>
        entry.label.toLowerCase().includes(this.query().toLowerCase()) &&
        (this.filter() === 'all' || entry.section.toLowerCase() === this.filter()),
    );
  /**
   * Loads the current month's expense entries when the page is created.
   *
   * @returns Nothing; the initial finance request starts as a side effect.
   */
  constructor() {
    void this.loadMonth();
  }

  /**
   * Loads and stores the current month's expense entries.
   *
   * @returns A promise that resolves after the transaction signal is populated.
   */
  private async loadMonth(): Promise<void> {
    const { month } = await this.finance.getMonth(this.currentMonth);
    this.entries.set(month.entries.filter((entry) => entry.type === 'EXPENSE'));
  }
  /**
   * Formats a transaction amount using the French euro currency format.
   *
   * @param value The numeric or serialized amount to format.
   * @returns The localized euro amount.
   */
  protected formatAmount(value: string | number): string {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(
      Number(value),
    );
  }
  /**
   * Converts an API section code into a French display label.
   *
   * @param section The section code returned by the API.
   * @returns The localized section label.
   */
  protected sectionLabel(section: string): string {
    return (
      { MANDATORY: 'Obligatoire', VARIABLE: 'Variable', PLEASURE: 'Plaisir' }[section] ?? section
    );
  }
  /**
   * Deletes an entry and removes it from the local list after success.
   *
   * @param id The identifier of the entry to delete.
   * @returns Nothing; the delete request updates local state asynchronously.
   */
  protected async deleteEntry(id: string): Promise<void> {
    await this.finance.deleteEntry(id);
    this.entries.update((entries) => entries.filter((entry) => entry.id !== id));
  }
  /**
   * Opens inline editing for an entry and copies its current values.
   *
   * @param entry The entry to edit.
   * @returns Nothing; editing signals are populated.
   */
  protected startEdit(entry: ApiEntry): void {
    this.editingId.set(entry.id);
    this.editingLabel.set(entry.label);
    this.editingAmount.set(Number(entry.amount));
  }
  /**
   * Closes inline editing without persisting changes.
   *
   * @returns Nothing; the active editing identifier is cleared.
   */
  protected cancelEdit(): void {
    this.editingId.set(null);
  }
  /**
   * Validates and persists the current inline edit.
   *
   * @param entry The original entry being edited.
   * @returns Nothing; an update request starts when the values are valid.
   */
  protected async saveEdit(entry: ApiEntry): Promise<void> {
    const label = this.editingLabel().trim();
    const amount = this.editingAmount();
    if (!label || !amount || amount <= 0) return;
    const { entry: updated } = await this.finance.updateEntry(entry.id, { label, amount });
    this.entries.update((entries) =>
      entries.map((current) => (current.id === updated.id ? updated : current)),
    );
    this.cancelEdit();
  }
}
