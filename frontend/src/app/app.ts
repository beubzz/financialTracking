import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { LucideMoon, LucideSun } from '@lucide/angular';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, LucideMoon, LucideSun],
  templateUrl: './app.html',
  styleUrl: './app-root.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  protected readonly isDark = signal(true);

  /**
   * Restores the saved theme preference and applies it to the document.
   *
   * @returns Nothing; the theme signal and document attribute are initialized as side effects.
   */
  constructor() {
    const savedTheme = localStorage.getItem('ledgerly-theme');
    this.isDark.set(savedTheme !== 'light');
    this.applyTheme();
  }

  /**
   * Toggles between the dark and light application themes.
   *
   * @returns Nothing; the preference is persisted and applied to the document.
   */
  protected toggleTheme(): void {
    this.isDark.update((isDark) => !isDark);
    localStorage.setItem('ledgerly-theme', this.isDark() ? 'dark' : 'light');
    this.applyTheme();
  }

  /**
   * Synchronizes the document theme attribute with the current signal value.
   *
   * @returns Nothing; the root document attribute is updated as a side effect.
   */
  private applyTheme(): void {
    document.documentElement.dataset['theme'] = this.isDark() ? 'dark' : 'light';
  }
}
