import { Routes } from '@angular/router';
import { authGuard } from './auth.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  {
    path: 'auth',
    /** Lazily loads the authentication page when the route is requested. */
    loadComponent: () => import('./pages/auth/auth-page').then(({ AuthPage }) => AuthPage),
  },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    /** Lazily loads the dashboard page after authentication succeeds. */
    loadComponent: () =>
      import('./pages/dashboard/dashboard-page').then(({ DashboardPage }) => DashboardPage),
  },
  {
    path: 'transactions',
    canActivate: [authGuard],
    /** Lazily loads the transactions page after authentication succeeds. */
    loadComponent: () =>
      import('./pages/transactions/transactions-page').then(
        ({ TransactionsPage }) => TransactionsPage,
      ),
  },
  {
    path: 'objectifs',
    canActivate: [authGuard],
    /** Lazily loads the goals page after authentication succeeds. */
    loadComponent: () => import('./pages/goals/goals-page').then(({ GoalsPage }) => GoalsPage),
  },
  {
    path: 'prevision-annuelle',
    canActivate: [authGuard],
    /** Lazily loads the annual forecast page after authentication succeeds. */
    loadComponent: () =>
      import('./pages/annual-forecast/annual-forecast-page').then(
        ({ AnnualForecastPage }) => AnnualForecastPage,
      ),
  },
  { path: '**', redirectTo: 'dashboard' },
];
