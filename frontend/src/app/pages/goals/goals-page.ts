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
  protected readonly adjustmentGoal = signal<Goal | null>(null);
  protected readonly adjustmentMode = signal<'add' | 'remove'>('add');
  protected name = '';
  protected target: number | null = null;
  protected saved: number | null = null;
  protected adjustmentAmount: number | null = null;
  protected readonly adjusting = signal(false);

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
   * Opens the savings adjustment modal for a goal.
   *
   * @param goal The goal whose saved amount should change.
   * @param mode Whether the modal should add or remove savings.
   * @returns Nothing; the adjustment draft is initialized synchronously.
   */
  protected openAdjustment(goal: Goal, mode: 'add' | 'remove'): void {
    if ((mode === 'add' && !this.canAdd(goal)) || (mode === 'remove' && !this.canRemove(goal))) {
      return;
    }
    this.adjustmentGoal.set(goal);
    this.adjustmentMode.set(mode);
    this.adjustmentAmount = null;
  }

  /**
   * Closes the savings adjustment modal and clears its draft.
   *
   * @returns Nothing; the adjustment state is reset.
   */
  protected closeAdjustment(): void {
    this.adjustmentGoal.set(null);
    this.adjustmentAmount = null;
  }

  /**
   * Saves the requested savings adjustment while enforcing its allowed bounds.
   *
   * @returns Nothing; the updated goal is persisted and replaced in local state asynchronously.
   */
  protected async saveAdjustment(): Promise<void> {
    const goal = this.adjustmentGoal();
    const amount = this.adjustmentAmount;
    if (!goal || amount === null || !Number.isFinite(amount) || amount <= 0) return;
    const limit = this.adjustmentLimit(goal);
    if (amount > limit) return;
    const saved = Number(goal.saved);
    const nextSaved =
      this.adjustmentMode() === 'add'
        ? Math.min(saved + amount, Number(goal.target))
        : Math.max(saved - amount, 0);
    this.adjusting.set(true);
    try {
      const { goal: updated } = await this.finance.updateGoal(goal.id, { saved: nextSaved });
      this.goals.update((goals) =>
        goals.map((current) => (current.id === updated.id ? updated : current)),
      );
      this.closeAdjustment();
    } finally {
      this.adjusting.set(false);
    }
  }

  /**
   * Returns the maximum adjustment allowed for the active goal and mode.
   *
   * @param goal The goal whose saved amount is being adjusted.
   * @returns The maximum amount that can be added or removed.
   */
  protected adjustmentLimit(goal: Goal): number {
    const saved = Number(goal.saved);
    return this.adjustmentMode() === 'add'
      ? Math.max(Number(goal.target) - saved, 0)
      : Math.max(saved, 0);
  }

  /**
   * Indicates whether savings can still be added to a goal.
   *
   * @param goal The goal to inspect.
   * @returns True when the goal is below its target.
   */
  protected canAdd(goal: Goal): boolean {
    return Number(goal.saved) < Number(goal.target);
  }

  /**
   * Indicates whether savings can be removed from a goal.
   *
   * @param goal The goal to inspect.
   * @returns True when the goal has saved money available to remove.
   */
  protected canRemove(goal: Goal): boolean {
    return Number(goal.saved) > 0;
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
   * Indicates whether a goal has reached or exceeded its target.
   *
   * @param goal The goal whose completion should be checked.
   * @returns True when the saved amount reaches the target amount.
   */
  protected isComplete(goal: Goal): boolean {
    return Number(goal.saved) >= Number(goal.target);
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
