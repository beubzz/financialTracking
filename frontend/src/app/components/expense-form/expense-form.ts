import { ChangeDetectionStrategy, Component, input, model, output } from '@angular/core';
import { FormsModule } from '@angular/forms';

type ExpenseSection = 'mandatory' | 'pleasure' | 'variable' | 'investment';
type Recurrence = 'week' | 'month' | 'year';

@Component({
  selector: 'app-expense-form',
  imports: [FormsModule],
  templateUrl: './expense-form.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ExpenseFormComponent {
  readonly section = input.required<ExpenseSection>();
  readonly editing = input(false);
  readonly label = model('');
  readonly amount = model<number | null>(null);
  readonly recurrence = model<Recurrence>('month');
  readonly close = output<void>();
  readonly submitForm = output<void>();
}
