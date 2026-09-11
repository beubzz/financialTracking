import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

/**
 * Provides the shared application shell used by authenticated pages.
 */
@Component({
  selector: 'app-layout',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './app-layout.html',
  styleUrl: './app-layout.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppLayoutComponent {
  /** Text displayed above the page title. */
  readonly eyebrow = input.required<string>();

  /** Main title displayed in the page header. */
  readonly title = input.required<string>();
}
