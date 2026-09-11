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

/**
 * Positions doughnut tooltips on the chart edge instead of over the center label.
 *
 * @param items The chart elements associated with the active tooltip.
 * @param eventPosition The pointer position used when no element is active.
 * @returns The tooltip coordinates constrained to the chart area.
 */
Tooltip.positioners.avoidCenter = function (items, eventPosition) {
  const { left, right, top, bottom } = this.chart.chartArea;
  const point = items[0] ? (items[0].element as ArcElement).getCenterPoint(true) : eventPosition;
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
  styleUrl: './budget-chart.scss',
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

  /**
   * Creates the reactive chart update effect.
   *
   * @returns Nothing; the chart effect is registered as a construction side effect.
   */
  constructor() {
    effect(
      /**
       * Rebuilds the chart data when one of the budget inputs changes.
       *
       * @returns Nothing; the chart is updated when the view is ready.
       */
      () => {
        const values = [
          this.mandatory(),
          this.variable(),
          this.pleasure(),
          this.investment(),
          Math.max(this.remaining(), 0),
        ];
        if (this.viewReady) this.updateChart(values);
      },
    );
  }

  /**
   * Initializes the theme observer and first chart render after the canvas exists.
   *
   * @returns Nothing; the chart and mutation observer are created as side effects.
   */
  ngAfterViewInit(): void {
    this.viewReady = true;
    this.themeObserver = new MutationObserver(
      /**
       * Refreshes chart borders after the document theme changes.
       *
       * @returns Nothing; the existing chart is updated in place.
       */
      () => {
        if (!this.chart) return;
        this.chart.data.datasets[0].borderColor = this.chartBorderColors();
        this.chart.data.datasets[0].borderWidth = this.chartBorderWidth();
        this.chart.update('none');
      },
    );
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

  /**
   * Releases the observer and Chart.js instance owned by this component.
   *
   * @returns Nothing; resources are disconnected and destroyed as side effects.
   */
  ngOnDestroy(): void {
    this.themeObserver?.disconnect();
    this.chart?.destroy();
  }

  /**
   * Creates or refreshes the doughnut chart with the supplied budget values.
   *
   * @param values Values for mandatory, variable, pleasure, investment and remaining amounts.
   * @returns Nothing; the Chart.js instance is created or updated as a side effect.
   */
  private updateChart(values: number[]): void {
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
              xAlign:
                /**
                 * Aligns the tooltip toward the side nearest the active arc.
                 *
                 * @param context The Chart.js tooltip context.
                 * @returns The horizontal tooltip alignment.
                 */ (context) =>
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
                label:
                  /**
                   * Formats a tooltip item with its label and euro amount.
                   *
                   * @param context The Chart.js tooltip item context.
                   * @returns The formatted tooltip label.
                   */ (context) => ` ${context.label}: ${this.formatAmount(Number(context.raw))}`,
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

  /**
   * Returns border colors appropriate for the active document theme.
   *
   * @returns The five border colors used by the doughnut segments.
   */
  private chartBorderColors(): string[] {
    return document.documentElement.dataset['theme'] === 'light'
      ? ['#c6d2ff', '#a9edf5', '#f1b8ff', '#b8ffd1', '#e3edf9']
      : ['#12201d', '#12201d', '#12201d', '#12201d', '#12201d'];
  }

  /**
   * Returns the segment border width appropriate for the active theme.
   *
   * @returns The Chart.js border width in pixels.
   */
  private chartBorderWidth(): number {
    return document.documentElement.dataset['theme'] === 'light' ? 2 : 5;
  }

  /**
   * Formats a chart amount using the French euro currency format.
   *
   * @param amount The numeric amount to format.
   * @returns The localized euro amount.
   */
  private formatAmount(amount: number): string {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount);
  }
}
