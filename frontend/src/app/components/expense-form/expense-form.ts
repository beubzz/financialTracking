import { ChangeDetectionStrategy, Component, input, model, output } from '@angular/core';
import { FormsModule } from '@angular/forms';

type ExpenseSection = 'mandatory' | 'pleasure' | 'variable' | 'investment';
type Recurrence = 'unique' | 'week' | 'month' | 'year';
interface ParentOption {
  id: string;
  label: string;
}

@Component({
  selector: 'app-expense-form',
  imports: [FormsModule],
  templateUrl: './expense-form.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExpenseFormComponent {
  readonly section = input.required<ExpenseSection>();
  readonly editing = input(false);
  readonly error = input('');
  readonly submitting = input(false);
  readonly label = model('');
  readonly amount = model<number | null>(null);
  readonly recurrence = model<Recurrence>('month');
  readonly parentLabel = input<string | null>(null);
  readonly parentOptions = input<ParentOption[]>([]);
  readonly parentId = model<string | null>(null);
  readonly close = output<void>();
  readonly submitForm = output<void>();
}
