import { AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, OnDestroy, effect, input, viewChild } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { ArcElement, Chart, DoughnutController, Legend, Tooltip } from 'chart.js';

Chart.register(ArcElement, DoughnutController, Legend, Tooltip);

@Component({
  selector: 'app-budget-chart',
  imports: [DecimalPipe],
  templateUrl: './budget-chart.html',
  host: { class: 'budget-chart' },
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BudgetChartComponent implements AfterViewInit, OnDestroy {
  readonly salary = input.required<number>();
  readonly mandatory = input.required<number>();
  readonly variable = input.required<number>();
  readonly pleasure = input.required<number>();
  readonly investment = input.required<number>();
  readonly remaining = input.required<number>();
  private readonly canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private chart?: Chart<'doughnut'>;
  private viewReady = false;

  constructor() {
    effect(() => {
      const values = [this.mandatory(), this.variable(), this.pleasure(), this.investment(), Math.max(this.remaining(), 0)];
      if (this.viewReady) this.updateChart(values);
    });
  }

  ngAfterViewInit() {
    this.viewReady = true;
    this.updateChart([this.mandatory(), this.variable(), this.pleasure(), this.investment(), Math.max(this.remaining(), 0)]);
  }

  ngOnDestroy() {
    this.chart?.destroy();
  }

  private updateChart(values: number[]) {
    const hasData = values.some((value) => value > 0);
    if (!this.chart) {
      this.chart = new Chart(this.canvas().nativeElement, {
        type: 'doughnut',
        data: {
          labels: ['Obligatoire', 'Variable', 'Plaisir', 'Investissement', 'Disponible'],
          datasets: [{ data: hasData ? values : [0, 0, 0, 0, 1], backgroundColor: ['#70bdd2', '#839b91', '#d5a66a', '#82dda9', hasData ? '#b8cbc4' : '#29413a'], borderColor: '#12201d', borderWidth: 5, hoverOffset: 8 }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '58%',
          animation: { duration: 500 },
          plugins: { legend: { display: false }, tooltip: { callbacks: { label: (context) => ` ${context.label}: ${this.formatAmount(Number(context.raw))}` } } }
        }
      });
      return;
    }
    this.chart.data.datasets[0].data = hasData ? values : [0, 0, 0, 0, 1];
    this.chart.data.datasets[0].backgroundColor = ['#70bdd2', '#839b91', '#d5a66a', '#82dda9', hasData ? '#b8cbc4' : '#29413a'];
    this.chart.update();
  }

  private formatAmount(amount: number) {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount);
  }
}
