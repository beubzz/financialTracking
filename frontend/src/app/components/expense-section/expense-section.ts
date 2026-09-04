import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

interface MoneyEntry { id: string; label: string; amount: number; recurrence: 'week' | 'month' | 'year'; section: 'mandatory' | 'pleasure' | 'variable' | 'investment'; }

@Component({
  selector: 'app-expense-section',
  templateUrl: './expense-section.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ExpenseSectionComponent {
  readonly title = input.required<string>();
  readonly eyebrow = input.required<string>();
  readonly description = input.required<string>();
  readonly section = input.required<'mandatory' | 'pleasure' | 'variable' | 'investment'>();
  readonly entries = input.required<MoneyEntry[]>();
  readonly total = input.required<number>();
  readonly add = output<void>();
  readonly remove = output<string>();
  readonly edit = output<MoneyEntry>();
  protected recurrenceLabel(recurrence: MoneyEntry['recurrence']) { return { week: 'semaine', month: 'mois', year: 'année' }[recurrence]; }
  protected formatAmount(amount: number) { return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount); }
}
