import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { FinanceService, Goal } from '../../finance.service';
import { AppLayoutComponent } from '../../components/app-layout/app-layout';

@Component({
  selector: 'app-goals-page',
  imports: [AppLayoutComponent, FormsModule, RouterLink],
  templateUrl: './goals-page.html',
  styleUrl: './goals-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GoalsPage {
  private readonly finance = inject(FinanceService);
  protected readonly goals = signal<Goal[]>([]);
  protected name = '';
  protected target: number | null = null;
  protected saved: number | null = null;

  /**
   * Loads the user's goals when the page is created.
   *
   * @returns Nothing; the initial goal request starts as a side effect.
   */
  constructor() {
    this.load();
  }

  /**
   * Creates a goal from the values entered in the form.
   *
   * @returns Nothing; a goal request starts when the input is valid.
   */
  protected async addGoal(): Promise<void> {
    if (!this.name.trim() || !this.target || this.target <= 0) return;
    const { goal } = await this.finance.addGoal({
      name: this.name.trim(),
      target: this.target,
      saved: this.saved ?? 0,
    });
    this.goals.update((goals) => [goal, ...goals]);
    this.name = '';
    this.target = null;
    this.saved = null;
  }
  /**
   * Calculates the capped completion percentage for a goal.
   *
   * @param goal The goal whose saved amount should be evaluated.
   * @returns The completion percentage capped at 100.
   */
  protected progress(goal: Goal): number {
    return Math.min(Math.round((Number(goal.saved) / Number(goal.target)) * 100), 100);
  }
  /**
   * Formats a goal amount using the French euro currency format.
   *
   * @param value The numeric or serialized amount to format.
   * @returns The localized euro amount.
   */
  protected format(value: string | number): string {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(
      Number(value),
    );
  }
  /**
   * Deletes a goal and removes it from the local list after success.
   *
   * @param id The identifier of the goal to delete.
   * @returns Nothing; the delete request updates the local list asynchronously.
   */
  protected async deleteGoal(id: string): Promise<void> {
    await this.finance.deleteGoal(id);
    this.goals.update((goals) => goals.filter((goal) => goal.id !== id));
  }

  /**
   * Loads all goals belonging to the current user.
   *
   * @returns Nothing; the goal signal is populated asynchronously.
   */
  private async load(): Promise<void> {
    const { goals } = await this.finance.getGoals();
    this.goals.set(goals);
  }
}
