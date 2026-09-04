import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { FinanceService, Goal } from '../../finance.service';

@Component({ selector: 'app-goals-page', imports: [FormsModule, RouterLink], templateUrl: './goals-page.html', changeDetection: ChangeDetectionStrategy.OnPush })
export class GoalsPage {
  private readonly finance = inject(FinanceService);
  protected readonly goals = signal<Goal[]>([]);
  protected name = ''; protected target: number | null = null; protected saved: number | null = null;
  constructor() { this.load(); }
  protected addGoal() { if (!this.name.trim() || !this.target || this.target <= 0) return; this.finance.addGoal({ name: this.name.trim(), target: this.target, saved: this.saved ?? 0 }).subscribe({ next: ({ goal }) => { this.goals.update((goals) => [goal, ...goals]); this.name = ''; this.target = null; this.saved = null; } }); }
  protected progress(goal: Goal) { return Math.min(Math.round((Number(goal.saved) / Number(goal.target)) * 100), 100); }
  protected format(value: string | number) { return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(Number(value)); }
  protected deleteGoal(id: string) { this.finance.deleteGoal(id).subscribe({ next: () => this.goals.update((goals) => goals.filter((goal) => goal.id !== id)) }); }
  private load() { this.finance.getGoals().subscribe(({ goals }) => this.goals.set(goals)); }
}
