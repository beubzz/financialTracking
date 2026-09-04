import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FinanceService, ApiEntry } from '../../finance.service';

@Component({ selector: 'app-transactions-page', imports: [RouterLink], templateUrl: './transactions-page.html', changeDetection: ChangeDetectionStrategy.OnPush })
export class TransactionsPage {
  private readonly finance = inject(FinanceService);
  protected readonly entries = signal<ApiEntry[]>([]);
  protected readonly query = signal('');
  protected readonly filter = signal<'all' | 'mandatory' | 'variable' | 'pleasure'>('all');
  protected readonly currentMonth = new Date().toISOString().slice(0, 7);
  protected readonly filteredEntries = () => this.entries().filter((entry) => entry.label.toLowerCase().includes(this.query().toLowerCase()) && (this.filter() === 'all' || entry.section.toLowerCase() === this.filter()));
  constructor() { this.finance.getMonth(this.currentMonth).subscribe(({ month }) => this.entries.set(month.entries.filter((entry) => entry.type === 'EXPENSE'))); }
  protected formatAmount(value: string | number) { return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(Number(value)); }
  protected sectionLabel(section: string) { return { MANDATORY: 'Obligatoire', VARIABLE: 'Variable', PLEASURE: 'Plaisir' }[section] ?? section; }
  protected deleteEntry(id: string) { this.finance.deleteEntry(id).subscribe({ next: () => this.entries.update((entries) => entries.filter((entry) => entry.id !== id)) }); }
}
