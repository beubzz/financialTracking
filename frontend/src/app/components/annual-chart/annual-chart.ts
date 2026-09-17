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
import {
  BarController,
  BarElement,
  CategoryScale,
  Chart,
  Filler,
  Legend,
  LineController,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
  type ChartDataset,
} from 'chart.js';

Chart.register(
  BarController,
  BarElement,
  CategoryScale,
  Filler,
  Legend,
  LineController,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
);

type AnnualDataset = ChartDataset<'bar' | 'line', number[]>;

@Component({
  selector: 'app-annual-chart',
  template: '<canvas #canvas aria-label="Evolution mensuelle des revenus et dépenses"></canvas>',
  styleUrl: './annual-chart.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnnualChartComponent implements AfterViewInit, OnDestroy {
  readonly labels = input.required<string[]>();
  readonly salary = input.required<number[]>();
  readonly mandatory = input.required<number[]>();
  readonly variable = input.required<number[]>();
  readonly pleasure = input.required<number[]>();
  readonly investment = input.required<number[]>();
  private readonly canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private chart?: Chart;
  private themeObserver?: MutationObserver;
  private viewReady = false;

  /**
   * Rebuilds the chart whenever the annual series change after view initialization.
   *
   * @returns Nothing; a reactive chart update effect is registered.
   */
  constructor() {
    effect(() => {
      if (this.viewReady) this.updateChart();
    });
  }

  /**
   * Creates the first chart once the canvas is available.
   *
   * @returns Nothing; the Chart.js instance is created as a side effect.
   */
  ngAfterViewInit(): void {
    this.viewReady = true;
    this.themeObserver = new MutationObserver(() => this.updateChart());
    this.themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });
    this.updateChart();
  }

  /**
   * Releases the Chart.js instance owned by this component.
   *
   * @returns Nothing; the chart is destroyed as a side effect.
   */
  ngOnDestroy(): void {
    this.themeObserver?.disconnect();
    this.chart?.destroy();
  }

  /**
   * Creates or refreshes the annual combined bar and line chart.
   *
   * @returns Nothing; the chart data and options are updated in place.
   */
  private updateChart(): void {
    const isLightTheme = document.documentElement.dataset['theme'] === 'light';
    const chartTextColor = isLightTheme ? '#527168' : '#78958a';
    const chartLegendColor = isLightTheme ? '#466258' : '#b8cbc4';
    const chartGridColor = isLightTheme ? 'rgba(82, 113, 104, 0.16)' : 'rgba(120, 149, 138, 0.16)';
    const tooltipBackground = isLightTheme ? '#ffffff' : '#172621';
    const tooltipBorder = isLightTheme ? '#cbdcd4' : '#385148';
    const tooltipTextColor = isLightTheme ? '#21302c' : '#e9f0ee';
    const datasets: AnnualDataset[] = [
      this.barDataset('Obligatoire', this.mandatory(), '#8fa8e8'),
      this.barDataset('Variable', this.variable(), '#79b8c8'),
      this.barDataset('Plaisir', this.pleasure(), '#c394d8'),
      this.barDataset('Investissement', this.investment(), '#68dfa0'),
      {
        type: 'line' as const,
        label: 'Salaire',
        data: this.salary(),
        borderColor: '#82dda9',
        backgroundColor: '#82dda9',
        borderWidth: 3,
        pointRadius: 3,
        pointHoverRadius: 5,
        tension: 0.32,
        fill: false,
        order: 0,
      },
    ];
    if (!this.chart) {
      this.chart = new Chart(this.canvas().nativeElement, {
        type: 'bar',
        data: { labels: this.labels(), datasets },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: { mode: 'index', intersect: false },
          scales: {
            x: {
              stacked: true,
              grid: { display: false },
              ticks: { color: chartTextColor, font: { family: 'DM Mono', size: 10 } },
            },
            y: {
              stacked: true,
              beginAtZero: true,
              grid: { color: chartGridColor },
              ticks: {
                color: chartTextColor,
                font: { family: 'DM Mono', size: 10 },
                callback: (value) => `${Number(value).toLocaleString('fr-FR')} €`,
              },
            },
          },
          plugins: {
            legend: {
              position: 'bottom',
              labels: {
                color: chartLegendColor,
                usePointStyle: true,
                padding: 18,
                font: { family: 'Manrope', size: 10 },
              },
            },
            tooltip: {
              backgroundColor: tooltipBackground,
              borderColor: tooltipBorder,
              borderWidth: 1,
              titleColor: tooltipTextColor,
              bodyColor: tooltipTextColor,
              callbacks: {
                label: (context) =>
                  ` ${context.dataset.label}: ${this.formatAmount(Number(context.raw))}`,
              },
            },
          },
        },
      });
      return;
    }
    this.chart.data.labels = this.labels();
    this.chart.data.datasets = datasets;
    this.chart.update();
  }

  /**
   * Builds one stacked expense dataset.
   *
   * @param label The legend label.
   * @param data The monthly values.
   * @param color The dataset color.
   * @returns A Chart.js bar dataset.
   */
  private barDataset(label: string, data: number[], color: string): AnnualDataset {
    return {
      type: 'bar' as const,
      label,
      data,
      backgroundColor: color,
      borderRadius: 3,
      borderSkipped: false,
      order: 1,
    };
  }

  /**
   * Formats a number as a localized euro amount.
   *
   * @param amount The amount to format.
   * @returns The formatted euro amount.
   */
  private formatAmount(amount: number): string {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount);
  }
}
