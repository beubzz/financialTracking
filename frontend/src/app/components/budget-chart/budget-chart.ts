import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  effect,
  input,
  viewChild,
} from '@angular/core';
import { DecimalPipe } from '@angular/common';
import {
  ArcElement,
  Chart,
  DoughnutController,
  Legend,
  Tooltip,
  type TooltipPositionerFunction,
} from 'chart.js';

declare module 'chart.js' {
  interface TooltipPositionerMap {
    avoidCenter: TooltipPositionerFunction<'doughnut'>;
  }
}

Chart.register(ArcElement, DoughnutController, Legend, Tooltip);

Tooltip.positioners.avoidCenter = function (items, eventPosition) {
  const { left, right, top, bottom } = this.chart.chartArea;
  const point = items[0]
    ? (items[0].element as ArcElement).getCenterPoint(true)
    : eventPosition;
  const centerX = (left + right) / 2;
  const pointX = point.x ?? centerX;
  const pointY = point.y ?? (top + bottom) / 2;
  const isLeft = pointX < centerX;
  const y = Math.min(Math.max(pointY, top + 35), bottom - 35);

  return { x: isLeft ? left + 10 : right - 10, y };
};

@Component({
  selector: 'app-budget-chart',
  imports: [DecimalPipe],
  templateUrl: './budget-chart.html',
  host: { class: 'budget-chart' },
  changeDetection: ChangeDetectionStrategy.OnPush,
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
  private themeObserver?: MutationObserver;
  private viewReady = false;

  constructor() {
    effect(() => {
      const values = [
        this.mandatory(),
        this.variable(),
        this.pleasure(),
        this.investment(),
        Math.max(this.remaining(), 0),
      ];
      if (this.viewReady) this.updateChart(values);
    });
  }

  ngAfterViewInit() {
    this.viewReady = true;
    this.themeObserver = new MutationObserver(() => {
      if (!this.chart) return;
      this.chart.data.datasets[0].borderColor = this.chartBorderColors();
      this.chart.data.datasets[0].borderWidth = this.chartBorderWidth();
      this.chart.update('none');
    });
    this.themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });
    this.updateChart([
      this.mandatory(),
      this.variable(),
      this.pleasure(),
      this.investment(),
      Math.max(this.remaining(), 0),
    ]);
  }

  ngOnDestroy() {
    this.themeObserver?.disconnect();
    this.chart?.destroy();
  }

  private updateChart(values: number[]) {
    const hasData = values.some((value) => value > 0);
    if (!this.chart) {
      this.chart = new Chart(this.canvas().nativeElement, {
        type: 'doughnut',
        data: {
          labels: ['Obligatoire', 'Variable', 'Plaisir', 'Investissement', 'Disponible'],
          datasets: [
            {
              data: hasData ? values : [0, 0, 0, 0, 1],
              backgroundColor: [
                '#8fa8e8',
                '#79b8c8',
                '#c394d8',
                '#68dfa0',
                hasData ? '#b6c5d6' : '#29413a',
              ],
              borderColor: this.chartBorderColors(),
              borderWidth: this.chartBorderWidth(),
              hoverOffset: 8,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '58%',
          animation: { duration: 500 },
          plugins: {
            legend: { display: false },
            tooltip: {
              position: 'avoidCenter',
              xAlign: (context) =>
                context.tooltip.caretX < context.chart.chartArea.width / 2 ? 'left' : 'right',
              backgroundColor: '#172621',
              borderColor: '#8fe5bd',
              borderWidth: 1,
              bodyColor: '#e9f0ee',
              bodyFont: { family: 'Manrope', size: 11, weight: 600 },
              displayColors: true,
              padding: 11,
              titleColor: '#ffffff',
              titleFont: { family: 'Manrope', size: 11, weight: 700 },
              cornerRadius: 7,
              caretPadding: 8,
              callbacks: {
                label: (context) => ` ${context.label}: ${this.formatAmount(Number(context.raw))}`,
              },
            },
          },
        },
      });
      return;
    }
    this.chart.data.datasets[0].data = hasData ? values : [0, 0, 0, 0, 1];
    this.chart.data.datasets[0].backgroundColor = [
      '#8fa8e8',
      '#79b8c8',
      '#c394d8',
      '#68dfa0',
      hasData ? '#b6c5d6' : '#29413a',
    ];
    this.chart.data.datasets[0].borderColor = this.chartBorderColors();
    this.chart.data.datasets[0].borderWidth = this.chartBorderWidth();
    this.chart.update();
  }

  private chartBorderColors() {
    return document.documentElement.dataset['theme'] === 'light'
      ? ['#c6d2ff', '#a9edf5', '#f1b8ff', '#b8ffd1', '#e3edf9']
      : ['#12201d', '#12201d', '#12201d', '#12201d', '#12201d'];
  }

  private chartBorderWidth() {
    return document.documentElement.dataset['theme'] === 'light' ? 2 : 5;
  }

  private formatAmount(amount: number) {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount);
  }
}
