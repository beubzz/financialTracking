import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FinanceService, ApiEntry } from '../../finance.service';

@Component({
  selector: 'app-transactions-page',
  imports: [RouterLink],
  templateUrl: './transactions-page.html',
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
  protected readonly filteredEntries = () =>
    this.entries().filter(
      (entry) =>
        entry.label.toLowerCase().includes(this.query().toLowerCase()) &&
        (this.filter() === 'all' || entry.section.toLowerCase() === this.filter()),
    );
  constructor() {
    this.finance
      .getMonth(this.currentMonth)
      .subscribe(({ month }) =>
        this.entries.set(month.entries.filter((entry) => entry.type === 'EXPENSE')),
      );
  }
  protected formatAmount(value: string | number) {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(
      Number(value),
    );
  }
  protected sectionLabel(section: string) {
    return (
      { MANDATORY: 'Obligatoire', VARIABLE: 'Variable', PLEASURE: 'Plaisir' }[section] ?? section
    );
  }
  protected deleteEntry(id: string) {
    this.finance
      .deleteEntry(id)
      .subscribe({
        next: () => this.entries.update((entries) => entries.filter((entry) => entry.id !== id)),
      });
  }
  protected startEdit(entry: ApiEntry) {
    this.editingId.set(entry.id);
    this.editingLabel.set(entry.label);
    this.editingAmount.set(Number(entry.amount));
  }
  protected cancelEdit() {
    this.editingId.set(null);
  }
  protected saveEdit(entry: ApiEntry) {
    const label = this.editingLabel().trim();
    const amount = this.editingAmount();
    if (!label || !amount || amount <= 0) return;
    this.finance.updateEntry(entry.id, { label, amount }).subscribe({
      next: ({ entry: updated }) => {
        this.entries.update((entries) =>
          entries.map((current) => (current.id === updated.id ? updated : current)),
        );
        this.cancelEdit();
      },
    });
  }
}
