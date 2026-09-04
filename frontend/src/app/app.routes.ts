import { Routes } from '@angular/router';
import { authGuard } from './auth.guard';

export const routes: Routes = [
	{ path: '', pathMatch: 'full', redirectTo: 'dashboard' },
	{ path: 'auth', loadComponent: () => import('./pages/auth/auth-page').then(({ AuthPage }) => AuthPage) },
	{ path: 'dashboard', canActivate: [authGuard], loadComponent: () => import('./pages/dashboard/dashboard-page').then(({ DashboardPage }) => DashboardPage) },
	{ path: '**', redirectTo: 'dashboard' }
];
