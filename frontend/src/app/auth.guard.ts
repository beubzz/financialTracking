import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

/**
 * Allows navigation only when a local authentication token exists.
 *
 * @returns True for authenticated users, otherwise a redirect UrlTree to `/auth`.
 */
export const authGuard: CanActivateFn = (): ReturnType<CanActivateFn> => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.isLoggedIn() ? true : router.createUrlTree(['/auth']);
};
