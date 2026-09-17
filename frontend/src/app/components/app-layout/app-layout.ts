import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { LucideMenu, LucideX } from '@lucide/angular';

/**
 * Provides the shared application shell used by authenticated pages.
 */
@Component({
  selector: 'app-layout',
  imports: [RouterLink, RouterLinkActive, LucideMenu, LucideX],
  templateUrl: './app-layout.html',
  styleUrl: './app-layout.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppLayoutComponent {
  /** Text displayed above the page title. */
  readonly eyebrow = input.required<string>();

  /** Main title displayed in the page header. */
  readonly title = input.required<string>();

  /** Whether the mobile navigation drawer is currently open. */
  protected readonly isMenuOpen = signal(false);

  /** Toggles the mobile navigation drawer. */
  protected toggleMenu(): void {
    this.isMenuOpen.update((isOpen) => !isOpen);
  }

  /** Closes the mobile navigation after a route has been selected. */
  protected closeMenu(): void {
    this.isMenuOpen.set(false);
  }
}
