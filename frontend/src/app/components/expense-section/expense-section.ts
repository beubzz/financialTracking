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
  styleUrl: './expense-section.scss',
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

  /**
   * Indicates whether this section supports collapsing.
   *
   * @returns True because every expense section exposes collapse controls.
   */
  protected isCollapsible(): boolean {
    return true;
  }

  /**
   * Toggles the collapsed state of the section.
   *
   * @returns Nothing; the collapsed signal is updated as a side effect.
   */
  protected toggleCollapsed(): void {
    this.collapsed.update((value) => !value);
  }

  /**
   * Converts an internal recurrence code into a French display label.
   *
   * @param recurrence The recurrence value to translate.
   * @returns The localized recurrence label.
   */
  protected recurrenceLabel(recurrence: MoneyEntry['recurrence']): string {
    return { unique: 'unique', week: 'semaine', month: 'mois', year: 'année' }[recurrence];
  }

  /**
   * Formats an expense amount using the French euro currency format.
   *
   * @param amount The numeric amount to format.
   * @returns The formatted euro amount.
   */
  protected formatAmount(amount: number): string {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount);
  }

  /**
   * Selects the section's top-level entries.
   *
   * @returns The entries belonging to the current section without a parent.
   */
  protected topLevelEntries(): MoneyEntry[] {
    return this.entries().filter((entry) => entry.section === this.section() && !entry.parentId);
  }

  /**
   * Finds all child entries associated with a parent entry.
   *
   * @param parentId The parent entry identifier.
   * @returns The child entries linked to the parent.
   */
  protected subentries(parentId: string): MoneyEntry[] {
    return this.entries().filter((entry) => entry.parentId === parentId);
  }

  /**
   * Checks whether an entry has at least one child entry.
   *
   * @param parentId The entry identifier to inspect.
   * @returns True when one or more children exist.
   */
  protected hasSubentries(parentId: string): boolean {
    return this.subentries(parentId).length > 0;
  }

  /**
   * Calculates the total amount of all children for a parent entry.
   *
   * @param parentId The parent entry identifier.
   * @returns The sum of all child amounts.
   */
  protected childrenTotal(parentId: string): number {
    return this.subentries(parentId).reduce((total, child) => total + child.amount, 0);
  }
}
