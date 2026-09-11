import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { LucideMoon, LucideSun } from '@lucide/angular';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, LucideMoon, LucideSun],
  templateUrl: './app.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  protected readonly isDark = signal(true);

  constructor() {
    const savedTheme = localStorage.getItem('ledgerly-theme');
    this.isDark.set(savedTheme !== 'light');
    this.applyTheme();
  }

  protected toggleTheme() {
    this.isDark.update((isDark) => !isDark);
    localStorage.setItem('ledgerly-theme', this.isDark() ? 'dark' : 'light');
    this.applyTheme();
  }

  private applyTheme() {
    document.documentElement.dataset['theme'] = this.isDark() ? 'dark' : 'light';
  }
}
