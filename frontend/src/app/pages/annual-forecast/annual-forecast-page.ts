import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AnnualChartComponent } from '../../components/annual-chart/annual-chart';
import { AppLayoutComponent } from '../../components/app-layout/app-layout';
import { AnnualMonth, ApiEntry, FinanceService } from '../../finance.service';
import { AuthService } from '../../auth.service';
import { LucideChevronLeft, LucideChevronRight, LucideRefreshCw } from '@lucide/angular';

type Section = 'mandatory' | 'variable' | 'pleasure' | 'investment';
interface MonthSummary {
  label: string;
  salary: number;
  mandatory: number;
  variable: number;
  pleasure: number;
  investment: number;
  expenses: number;
  remaining: number;
}

@Component({
  selector: 'app-annual-forecast-page',
  imports: [
    AppLayoutComponent,
    AnnualChartComponent,
    LucideChevronLeft,
    LucideChevronRight,
    LucideRefreshCw,
  ],
  templateUrl: './annual-forecast-page.html',
  styleUrl: './annual-forecast-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnnualForecastPage {
  private readonly finance = inject(FinanceService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  protected readonly year = signal(new Date().getFullYear());
  protected readonly months = signal<MonthSummary[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal('');

  protected readonly labels = computed(() => this.months().map((month) => month.label));
  protected readonly salaries = computed(() => this.months().map((month) => month.salary));
  protected readonly mandatory = computed(() => this.months().map((month) => month.mandatory));
  protected readonly variable = computed(() => this.months().map((month) => month.variable));
  protected readonly pleasure = computed(() => this.months().map((month) => month.pleasure));
  protected readonly investment = computed(() => this.months().map((month) => month.investment));
  protected readonly totalSalary = computed(() =>
    this.salaries().reduce((total, value) => total + value, 0),
  );
  protected readonly totalExpenses = computed(() =>
    this.months().reduce((total, month) => total + month.expenses, 0),
  );
  protected readonly totalRemaining = computed(() => this.totalSalary() - this.totalExpenses());
  protected readonly averageExpenses = computed(() => this.totalExpenses() / 12);
  protected readonly savingsRate = computed(() =>
    this.totalSalary() ? Math.round((this.totalRemaining() / this.totalSalary()) * 100) : 0,
  );
  protected readonly bestMonth = computed(() =>
    this.months().reduce<MonthSummary | null>(
      (best, month) => (!best || month.remaining > best.remaining ? month : best),
      null,
    ),
  );
  protected readonly largestSection = computed(() => {
    const totals = [
      ['Obligatoire', this.mandatory().reduce((total, value) => total + value, 0)],
      ['Variable', this.variable().reduce((total, value) => total + value, 0)],
      ['Plaisir', this.pleasure().reduce((total, value) => total + value, 0)],
      ['Investissement', this.investment().reduce((total, value) => total + value, 0)],
    ] as [string, number][];
    return totals.reduce(
      (largest, current) => (current[1] > largest[1] ? current : largest),
      totals[0],
    );
  });

  /**
   * Loads the current year's financial data when the annual page is created.
   *
   * @returns Nothing; the annual request starts as a side effect.
   */
  constructor() {
    void this.loadYear();
  }

  /**
   * Moves the annual report to a neighboring calendar year.
   *
   * @param offset The number of years to move backward or forward.
   * @returns Nothing; the year changes and the report reloads.
   */
  protected changeYear(offset: number): void {
    this.year.update((year) => year + offset);
    void this.loadYear();
  }

  /**
   * Reloads the annual report for the selected year.
   *
   * @returns Nothing; loading state and annual data are updated asynchronously.
   */
  protected async loadYear(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      const response = await this.finance.getAnnual(this.year());
      this.months.set(this.buildSummaries(response.months, response.year));
    } catch {
      this.error.set(
        "Impossible de charger la prévision annuelle. Vérifiez que l'API est disponible.",
      );
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Logs out the current user and returns to authentication.
   *
   * @returns Nothing; session and navigation are updated as side effects.
   */
  protected logout(): void {
    this.auth.logout();
    void this.router.navigateByUrl('/auth');
  }

  /**
   * Formats a number as a localized euro amount.
   *
   * @param amount The amount to format.
   * @returns The formatted euro amount.
   */
  protected formatAmount(amount: number): string {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount);
  }

  /**
   * Creates stable monthly rows and includes empty months in the report.
   *
   * @param months Months returned by the API.
   * @param year The selected calendar year.
   * @returns Twelve ordered monthly summaries.
   */
  private buildSummaries(months: AnnualMonth[], year: number): MonthSummary[] {
    const byMonth = new Map(months.map((month) => [this.monthKey(month.month), month]));
    return Array.from({ length: 12 }, (_, index) => {
      const key = `${year}-${String(index + 1).padStart(2, '0')}`;
      const month = byMonth.get(key);
      const values = this.summarizeEntries(month?.entries ?? []);
      return {
        label: new Intl.DateTimeFormat('fr-FR', { month: 'short' }).format(
          new Date(Date.UTC(year, index, 1)),
        ),
        ...values,
        expenses: values.mandatory + values.variable + values.pleasure + values.investment,
        remaining:
          values.salary -
          (values.mandatory + values.variable + values.pleasure + values.investment),
      };
    });
  }

  /**
   * Aggregates salary and expense sections for one month's entries.
   *
   * @param entries The persisted entries for a month.
   * @returns Section totals for that month.
   */
  private summarizeEntries(
    entries: ApiEntry[],
  ): Omit<MonthSummary, 'label' | 'expenses' | 'remaining'> {
    const totals: Omit<MonthSummary, 'label' | 'expenses' | 'remaining'> = {
      salary: 0,
      mandatory: 0,
      variable: 0,
      pleasure: 0,
      investment: 0,
    };
    entries.forEach((entry) => {
      const amount = Number(entry.amount);
      if (entry.type === 'INCOME') {
        totals.salary += amount;
      } else if (entry.section.toLowerCase() in totals) {
        totals[entry.section.toLowerCase() as Section] += amount;
      }
    });
    return totals;
  }

  /**
   * Converts an API date into a YYYY-MM lookup key.
   *
   * @param month The serialized month date.
   * @returns The month lookup key.
   */
  private monthKey(month: string): string {
    return month.slice(0, 7);
  }
}
