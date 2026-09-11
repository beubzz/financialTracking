import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import {
  LucideChevronDown,
  LucideChevronRight,
  LucideReceipt,
  LucideShoppingCart,
  LucideSparkles,
  LucideTrendingUp,
} from '@lucide/angular';

interface MoneyEntry {
  id: string;
  label: string;
  amount: number;
  recurrence: 'unique' | 'week' | 'month' | 'year';
  section: 'mandatory' | 'pleasure' | 'variable' | 'investment';
  parentId?: string | null;
}

@Component({
  selector: 'app-expense-section',
  imports: [
    LucideChevronDown,
    LucideChevronRight,
    LucideReceipt,
    LucideShoppingCart,
    LucideSparkles,
    LucideTrendingUp,
  ],
  templateUrl: './expense-section.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExpenseSectionComponent {
  readonly title = input.required<string>();
  readonly eyebrow = input.required<string>();
  readonly description = input.required<string>();
  readonly section = input.required<'mandatory' | 'pleasure' | 'variable' | 'investment'>();
  readonly entries = input.required<MoneyEntry[]>();
  readonly total = input.required<number>();
  protected readonly collapsed = signal(false);
  readonly add = output<void>();
  readonly remove = output<string>();
  readonly edit = output<MoneyEntry>();
  readonly addSubentry = output<MoneyEntry>();
  protected isCollapsible() {
    return true;
  }
  protected toggleCollapsed() {
    this.collapsed.update((value) => !value);
  }
  protected recurrenceLabel(recurrence: MoneyEntry['recurrence']) {
    return { unique: 'unique', week: 'semaine', month: 'mois', year: 'année' }[recurrence];
  }
  protected formatAmount(amount: number) {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount);
  }
  protected topLevelEntries() {
    return this.entries().filter((entry) => entry.section === this.section() && !entry.parentId);
  }
  protected subentries(parentId: string) {
    return this.entries().filter((entry) => entry.parentId === parentId);
  }
  protected hasSubentries(parentId: string) {
    return this.subentries(parentId).length > 0;
  }
  protected childrenTotal(parentId: string) {
    return this.subentries(parentId).reduce((total, child) => total + child.amount, 0);
  }
}
